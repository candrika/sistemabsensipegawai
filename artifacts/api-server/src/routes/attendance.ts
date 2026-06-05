import { Router, type IRouter } from "express";
import {
  db,
  attendanceTable,
  employeesTable,
  documentsTable,
  insertAttendanceSchema,
} from "@workspace/db";
import { eq, count, and, lte, gte, sql, or, inArray } from "drizzle-orm";

const router: IRouter = Router();

router.get("/attendance/summary", async (req, res) => {
  try {
    const conditions: any[] = [];
    
    // Filter by employee if pegawai role
    if (req.user?.roleName === "pegawai" && req.user?.employeeId) {
      conditions.push(eq(attendanceTable.employeeId, req.user.employeeId));
    }

    const rows = await db
      .select({ status: attendanceTable.status, count: count() })
      .from(attendanceTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .groupBy(attendanceTable.status);

    const summary = { izin: 0, cuti: 0, dinas: 0, absen: 0 };

    for (const row of rows) {
      if (row.status in summary) {
        (summary as any)[row.status] = Number(row.count);
      }
    }

    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to get attendance summary");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const { status, date } = req.query as {
      status?: string;
      date?: string;
    };
    
    const conditions = [];
    const isAttendanceStatus =
      !status || ["izin", "cuti", "dinas", "absen"].includes(status);

    // Filter by employee if pegawai role
    if (req.user?.roleName === "pegawai" && req.user?.employeeId) {
      conditions.push(eq(attendanceTable.employeeId, req.user.employeeId));
    }

    if (status && ["izin", "cuti", "dinas", "absen"].includes(status)) {
      conditions.push(eq(attendanceTable.status, status as any));
    }

    if (date) {
      conditions.push(
        and(
          lte(attendanceTable.tglMulai, date),
          gte(attendanceTable.tglAkhir, date)
        )
      );
    }

    const records = !isAttendanceStatus ? [] : await db
      .select({
        id: attendanceTable.id,
        employeeId: attendanceTable.employeeId,
        status: attendanceTable.status,
        tglMulai: attendanceTable.tglMulai,
        tglAkhir: attendanceTable.tglAkhir,
        dokumenPendukung: attendanceTable.dokumenPendukung,
        alasan: attendanceTable.alasan,
        keterangan: attendanceTable.keterangan,
        createdAt: attendanceTable.createdAt,
        source: sql<string>`'attendance'`,

        employee: {
          id: employeesTable.id,
          nama: employeesTable.nama,
          nopek: employeesTable.nopek,
          createdAt: employeesTable.createdAt,
        },
      })
      .from(attendanceTable)
      .leftJoin(
        employeesTable,
        eq(attendanceTable.employeeId, employeesTable.id)
      )
      .where(conditions.length ? and(...conditions) : undefined);

    // Synthesize SKMJ / SURAT_TUGAS from documents into attendance view
    let docDerived: any[] = [];
    const wantSkmj = !status || status === "skmj";
    const wantSurat = !status || status === "surat_tugas";
    const wantedTypes: Array<"SKMJ" | "SURAT_TUGAS"> = [];
    if (wantSkmj) wantedTypes.push("SKMJ");
    if (wantSurat) wantedTypes.push("SURAT_TUGAS");

    if (wantedTypes.length > 0) {
      const docConds: any[] = [inArray(documentsTable.type, wantedTypes as any)];
      
      // Filter by employee if pegawai role
      if (req.user?.roleName === "pegawai" && req.user?.employeeId) {
        docConds.push(eq(documentsTable.employeeId, req.user.employeeId));
      }
      
      if (date) {
        docConds.push(
          and(
            lte(documentsTable.tanggal, date),
            or(
              sql`${documentsTable.expirationDate} IS NULL`,
              gte(documentsTable.expirationDate, date)
            )
          )
        );
      }

      docDerived = await db
        .select({
          id: documentsTable.id,
          employeeId: documentsTable.employeeId,
          status: sql<string>`LOWER(${documentsTable.type})`,
          tglMulai: documentsTable.tanggal,
          tglAkhir: sql<string>`COALESCE(${documentsTable.expirationDate}::text, ${documentsTable.tanggal})`,
          dokumenPendukung: documentsTable.filePath,
          alasan: documentsTable.perihal,
          keterangan: documentsTable.keterangan,
          createdAt: documentsTable.createdAt,
          source: sql<string>`'document'`,
          employee: {
            id: employeesTable.id,
            nama: employeesTable.nama,
            nopek: employeesTable.nopek,
            createdAt: employeesTable.createdAt,
          },
        })
        .from(documentsTable)
        .leftJoin(
          employeesTable,
          eq(documentsTable.employeeId, employeesTable.id)
        )
        .where(and(...docConds));
    }

    const combined = [...records, ...docDerived];

    res.json(
      combined.map((r) => ({
        ...r,
        createdAt:
          r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        employee: r.employee?.id
          ? {
              ...r.employee,
              createdAt:
                r.employee.createdAt instanceof Date
                  ? r.employee.createdAt.toISOString()
                  : r.employee.createdAt,
            }
          : null,
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get attendance records");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/attendance", async (req, res) => {
  try {
    const parsed = insertAttendanceSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues,
      });
    }

    const data = parsed.data;

    // Pegawai hanya bisa create attendance untuk diri sendiri
    if (req.user?.roleName === "pegawai" && req.user?.employeeId && data.employeeId !== req.user.employeeId) {
      return res.status(403).json({ message: "Forbidden: dapat hanya input data diri sendiri" });
    }

    const payload = {
      employeeId: data.employeeId,
      status: data.status,
      tglMulai: data.tglMulai,
      tglAkhir: data.tglAkhir,
      alasan: data.alasan ?? null,
      keterangan: data.keterangan ?? null,
      dokumenPendukung:
        typeof data.dokumenPendukung === "string"
          ? data.dokumenPendukung
          : data.dokumenPendukung
          ? JSON.stringify(data.dokumenPendukung)
          : null,
    };

    const [record] = await db
      .insert(attendanceTable)
      .values(payload)
      .returning();

    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, record.employeeId));

    // Note: izin/cuti/dinas attendance entries are surfaced in the
    // documents listing via a synthetic union in GET /documents (no
    // duplicate row inserted into the documents table).

    return res.status(201).json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      employee: employee
        ? {
            ...employee,
            createdAt: employee.createdAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create attendance record");
    return res.status(500).json({
      message: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

router.put("/attendance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const parsed = insertAttendanceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues,
      });
    }

    // Check if pegawai is trying to update someone else's record
    if (req.user?.roleName === "pegawai" && req.user?.employeeId) {
      const [existingRecord] = await db
        .select()
        .from(attendanceTable)
        .where(eq(attendanceTable.id, id));
      
      if (!existingRecord || existingRecord.employeeId !== req.user.employeeId) {
        return res.status(403).json({ message: "Forbidden: dapat hanya edit data diri sendiri" });
      }
    }

    const [record] = await db
      .update(attendanceTable)
      .set(parsed.data)
      .where(eq(attendanceTable.id, id))
      .returning();

    if (!record) {
      return res.status(404).json({ message: "Record not found" });
    }

    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, record.employeeId));

    return res.json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      employee: employee
        ? {
            ...employee,
            createdAt: employee.createdAt.toISOString(),
          }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update attendance record");
    return res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/attendance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    // Check if pegawai is trying to delete someone else's record
    if (req.user?.roleName === "pegawai" && req.user?.employeeId) {
      const [existingRecord] = await db
        .select()
        .from(attendanceTable)
        .where(eq(attendanceTable.id, id));
      
      if (!existingRecord || existingRecord.employeeId !== req.user.employeeId) {
        return res.status(403).json({ message: "Forbidden: dapat hanya hapus data diri sendiri" });
      }
    }

    const [deleted] = await db
      .delete(attendanceTable)
      .where(eq(attendanceTable.id, id))
      .returning();

    if (!deleted) {
      return res.status(404).json({ message: "Record not found" });
    }

    return res.json({ message: "Record deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete attendance record");
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
