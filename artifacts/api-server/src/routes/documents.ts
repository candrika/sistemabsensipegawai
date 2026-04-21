import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  db,
  documentsTable,
  employeesTable,
  attendanceTable,
  insertDocumentSchema,
} from "@workspace/db";
import { eq, count, and, gt, isNull, or, sql, inArray } from "drizzle-orm";

// Ensure upload directory exists
const UPLOAD_DIR = "uploads/documents";
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (_req: any, file: any, cb: any) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
  ];
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Invalid file type. Only PDF, Word, and images are allowed."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

const router: IRouter = Router();

// =====================================================
// SUMMARY (per-type, only non-expired records)
// IJIN  : count attendance(izin|cuti) where end-date >= today
// DINAS : count attendance(dinas)     where end-date >= today
// SKMJ / SURAT_TUGAS : count documents where expirationDate is null or >= today
// =====================================================
router.get("/documents/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // IJIN + DINAS from attendance (auto presensi)
    const attRows = await db
      .select({ status: attendanceTable.status, count: count() })
      .from(attendanceTable)
      .where(
        and(
          inArray(attendanceTable.status, ["izin", "cuti", "dinas"] as any),
          gt(attendanceTable.tglAkhir, today)
        )
      )
      .groupBy(attendanceTable.status);

    // SKMJ + SURAT_TUGAS from documents
    const docRows = await db
      .select({ type: documentsTable.type, count: count() })
      .from(documentsTable)
      .where(
        and(
          inArray(documentsTable.type, ["SKMJ", "SURAT_TUGAS"] as any),
          or(
            isNull(documentsTable.expirationDate),
            gt(documentsTable.expirationDate, today)
          )
        )
      )
      .groupBy(documentsTable.type);

    const summary = { IJIN: 0, DINAS: 0, SKMJ: 0, SURAT_TUGAS: 0 };

    for (const r of attRows) {
      if (r.status === "izin" || r.status === "cuti") summary.IJIN += Number(r.count);
      else if (r.status === "dinas") summary.DINAS += Number(r.count);
    }
    for (const r of docRows) {
      if (r.type in summary) (summary as any)[r.type] = Number(r.count);
    }

    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to get document summary");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    res.status(200).json({ filePath: `/uploads/documents/${req.file.filename}` });
  } catch (err) {
    req.log.error({ err }, "Failed to upload file");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================================================
// LIST DOCUMENTS
// IJIN / DINAS  ->  derived from attendance table
// SKMJ / SURAT_TUGAS  ->  real rows from documents table
// no filter -> union of all four
// =====================================================
router.get("/documents", async (req, res) => {
  try {
    const { type } = req.query as { type?: string };
    const today = new Date().toISOString().split("T")[0];

    const wantOfficial =
      !type || type === "SKMJ" || type === "SURAT_TUGAS";
    const wantAttendance =
      !type || type === "IJIN" || type === "DINAS";

    let officialDocs: any[] = [];
    if (wantOfficial) {
      const conds: any[] = [];
      if (type === "SKMJ" || type === "SURAT_TUGAS") {
        conds.push(eq(documentsTable.type, type as any));
      } else {
        conds.push(inArray(documentsTable.type, ["SKMJ", "SURAT_TUGAS"] as any));
      }

      officialDocs = await db
        .select({
          id: documentsTable.id,
          employeeId: documentsTable.employeeId,
          type: documentsTable.type,
          nomorSurat: documentsTable.nomorSurat,
          perihal: documentsTable.perihal,
          tanggal: documentsTable.tanggal,
          expirationDate: documentsTable.expirationDate,
          status: documentsTable.status,
          keterangan: documentsTable.keterangan,
          filePath: documentsTable.filePath,
          createdAt: documentsTable.createdAt,
          source: sql<string>`'official'`,
          employee: {
            id: employeesTable.id,
            nama: employeesTable.nama,
            nopek: employeesTable.nopek,
            jabatan: employeesTable.jabatan,
            createdAt: employeesTable.createdAt,
          },
        })
        .from(documentsTable)
        .leftJoin(
          employeesTable,
          eq(documentsTable.employeeId, employeesTable.id)
        )
        .where(and(...conds));
    }

    let attendanceDocs: any[] = [];
    if (wantAttendance) {
      const attConds: any[] = [];
      if (type === "IJIN") {
        attConds.push(inArray(attendanceTable.status, ["izin", "cuti"] as any));
      } else if (type === "DINAS") {
        attConds.push(eq(attendanceTable.status, "dinas"));
      } else {
        attConds.push(
          inArray(attendanceTable.status, ["izin", "cuti", "dinas"] as any)
        );
      }

      attendanceDocs = await db
        .select({
          id: attendanceTable.id,
          employeeId: attendanceTable.employeeId,
          type: sql<string>`CASE WHEN ${attendanceTable.status} = 'dinas' THEN 'DINAS' ELSE 'IJIN' END`,
          nomorSurat: sql<string>`'AUTO-PRESENSI'`,
          perihal: attendanceTable.alasan,
          tanggal: attendanceTable.tglMulai,
          expirationDate: attendanceTable.tglAkhir,
          status: sql<string>`'approved'`,
          keterangan: attendanceTable.keterangan,
          filePath: attendanceTable.dokumenPendukung,
          createdAt: attendanceTable.createdAt,
          source: sql<string>`'attendance'`,
          employee: {
            id: employeesTable.id,
            nama: employeesTable.nama,
            nopek: employeesTable.nopek,
            jabatan: employeesTable.jabatan,
            createdAt: employeesTable.createdAt,
          },
        })
        .from(attendanceTable)
        .leftJoin(
          employeesTable,
          eq(attendanceTable.employeeId, employeesTable.id)
        )
        .where(and(...attConds));
    }

    const combined = [...officialDocs, ...attendanceDocs];

    const formatted = combined
      .map((r) => ({
        ...r,
        isExpired: r.expirationDate ? r.expirationDate < today : false,
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
      .sort(
        (a, b) =>
          new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
      );

    res.json(formatted);
  } catch (err) {
    req.log.error({ err }, "Failed to list documents");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [record] = await db
      .select({
        id: documentsTable.id,
        employeeId: documentsTable.employeeId,
        type: documentsTable.type,
        nomorSurat: documentsTable.nomorSurat,
        perihal: documentsTable.perihal,
        tanggal: documentsTable.tanggal,
        expirationDate: documentsTable.expirationDate,
        status: documentsTable.status,
        keterangan: documentsTable.keterangan,
        filePath: documentsTable.filePath,
        createdAt: documentsTable.createdAt,
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
      .from(documentsTable)
      .leftJoin(
        employeesTable,
        eq(documentsTable.employeeId, employeesTable.id)
      )
      .where(eq(documentsTable.id, id));
    if (!record) return res.status(404).json({ message: "Document not found" });
    const today = new Date().toISOString().split("T")[0];
    res.json({
      ...record,
      isExpired: record.expirationDate ? record.expirationDate < today : false,
      createdAt: record.createdAt.toISOString(),
      employee: record.employee?.id
        ? { ...record.employee, createdAt: record.employee.createdAt.toISOString() }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: "Validation failed", errors: parsed.error.issues });

    // SKMJ and SURAT_TUGAS are the only types that should be created
    // via the documents endpoint. IJIN/DINAS come from attendance.
    if (parsed.data.type !== "SKMJ" && parsed.data.type !== "SURAT_TUGAS") {
      return res.status(400).json({
        message:
          "Only SKMJ and SURAT_TUGAS can be created here. IJIN/DINAS are auto-generated from attendance.",
      });
    }

    const [record] = await db
      .insert(documentsTable)
      .values(parsed.data)
      .returning();
    const [employee] = await db
      .select()
      .from(employeesTable)
      .where(eq(employeesTable.id, record.employeeId));
    res.status(201).json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      employee: employee
        ? { ...employee, createdAt: employee.createdAt.toISOString() }
        : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create document");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const { status } = req.body;
    if (!status || !["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const [updated] = await db
      .update(documentsTable)
      .set({ status: status as any })
      .where(eq(documentsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ message: "Document not found" });
    res.json({
      ...updated,
      createdAt: updated.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update document");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/documents/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db
      .delete(documentsTable)
      .where(eq(documentsTable.id, id))
      .returning();
    if (!deleted) return res.status(404).json({ message: "Document not found" });
    res.json({ message: "Document deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
