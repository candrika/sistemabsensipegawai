import { Router, type IRouter } from "express";
import { db, attendanceTable, employeesTable, insertAttendanceSchema } from "@workspace/db";
import { eq, count, and, lte, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/attendance/summary", async (req, res) => {
  try {
    const rows = await db
      .select({ status: attendanceTable.status, count: count() })
      .from(attendanceTable)
      .groupBy(attendanceTable.status);
    const summary = { izin: 0, cuti: 0, dinas: 0 };
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
    const { status, date } = req.query as { status?: string; date?: string };
    const conditions = [];
    if (status && ["izin", "cuti", "dinas"].includes(status)) {
      conditions.push(eq(attendanceTable.status, status as any));
    }
    if (date) {
      conditions.push(and(lte(attendanceTable.tglMulai, date), gte(attendanceTable.tglAkhir, date)) as any);
    }

    const records = await db
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
        employee: {
          id: employeesTable.id,
          nama: employeesTable.nama,
          nopek: employeesTable.nopek,
          foto: employeesTable.foto,
          jabatan: employeesTable.jabatan,
          departemen: employeesTable.departemen,
          createdAt: employeesTable.createdAt,
        },
      })
      .from(attendanceTable)
      .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(attendanceTable.tglMulai);

    res.json(records.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      employee: r.employee ? { ...r.employee, createdAt: r.employee.createdAt.toISOString() } : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get attendance records");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/attendance", async (req, res) => {
  try {
    const parsed = insertAttendanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.insert(attendanceTable).values(parsed.data).returning();
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, record.employeeId));
    res.status(201).json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      employee: employee ? { ...employee, createdAt: employee.createdAt.toISOString() } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create attendance record");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/attendance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = insertAttendanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.update(attendanceTable).set(parsed.data).where(eq(attendanceTable.id, id)).returning();
    if (!record) return res.status(404).json({ message: "Record not found" });
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, record.employeeId));
    res.json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      employee: employee ? { ...employee, createdAt: employee.createdAt.toISOString() } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update attendance record");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/attendance/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db.delete(attendanceTable).where(eq(attendanceTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete attendance record");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
