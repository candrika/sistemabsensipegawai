import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import { db, documentsTable, employeesTable, attendanceTable, insertDocumentSchema } from "@workspace/db";
import { eq, count, and, gt, isNull, or, sql } from "drizzle-orm";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/documents");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const fileFilter = (req: any, file: any, cb: any) => {
  const allowedMimes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF and Word documents are allowed."));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router: IRouter = Router();

router.get("/documents/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format

    // Get count of non-expired attendance records for each document type
    const rows = await db
      .select({ type: attendanceTable.type, count: count() })
      .from(attendanceTable)
      .where(
        or(
          isNull(attendanceTable.expirationDate), // No expiration date
          gt(attendanceTable.expirationDate, today) // Not expired yet
        )
      )
      .groupBy(attendanceTable.type);

    const summary = { IJIN: 0, DINAS: 0, SKMJ: 0, SURAT_TUGAS: 0 };
    for (const row of rows) {
      if (row.type in summary) {
        (summary as any)[row.type] = Number(row.count);
      }
    }
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to get document summary");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const filePath = `/uploads/documents/${req.file.filename}`;
    res.status(200).json({ filePath });
  } catch (err) {
    req.log.error({ err }, "Failed to upload file");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/documents", async (req, res) => {
  try {
    const { type } = req.query as { type?: string };
    const validTypes = ["IJIN", "DINAS", "SKMJ", "SURAT_TUGAS"];
    const conditions = [];

    if (type && validTypes.includes(type)) {
      conditions.push(eq(documentsTable.type, type as any));
    }

    // 1. Query Tabel Documents (Official)
    const officialDocs = await db
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
        },
      })
      .from(documentsTable)
      .leftJoin(employeesTable, eq(documentsTable.employeeId, employeesTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // 2. Query Tabel Attendance (Otomatis)
    let attendanceDocs: any[] = [];
    
    // Filter pencarian ke tabel attendance
    const isSearchAll = !type;
    const isSearchIjin = type === "IJIN";
    const isSearchDinas = type === "DINAS";

    if (isSearchAll || isSearchIjin || isSearchDinas) {
      const attConditions = [sql`${attendanceTable.dokumenPendukung} IS NOT NULL`];

      if (isSearchIjin) {
        attConditions.push(or(eq(attendanceTable.status, "izin"), eq(attendanceTable.status, "cuti")));
      } else if (isSearchDinas) {
        attConditions.push(eq(attendanceTable.status, "dinas"));
      }

      attendanceDocs = await db
        .select({
          id: attendanceTable.id,
          employeeId: attendanceTable.employeeId,
          type: sql<string>`CASE 
            WHEN ${attendanceTable.status} = 'dinas' THEN 'DINAS' 
            ELSE 'IJIN' 
          END`,
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
          },
        })
        .from(attendanceTable)
        .leftJoin(employeesTable, eq(attendanceTable.employeeId, employeesTable.id))
        .where(and(...attConditions));
    }

    // 3. Gabung dan Format
    const combined = [...officialDocs, ...attendanceDocs];
    const today = new Date().toISOString().split('T')[0];

    const formatted = combined
      .map((r) => ({
        ...r,
        isExpired: r.expirationDate ? r.expirationDate < today : false,
        createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        employee: r.employee?.id ? {
          ...r.employee,
          createdAt: r.employee.createdAt instanceof Date ? r.employee.createdAt.toISOString() : r.employee.createdAt
        } : null,
      }))
      .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());

    res.json(formatted);

  } catch (err) {
    // Log ini akan muncul di terminal jika ada error lagi
    console.error("DETAIL ERROR DOKUMEN:", err);
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
      .leftJoin(employeesTable, eq(documentsTable.employeeId, employeesTable.id))
      .where(eq(documentsTable.id, id));
    if (!record) return res.status(404).json({ message: "Document not found" });
    const today = new Date().toISOString().split('T')[0];
    res.json({
      ...record,
      isExpired: record.expirationDate && record.expirationDate < today,
      createdAt: record.createdAt.toISOString(),
      employee: record.employee ? { ...record.employee, createdAt: record.employee.createdAt.toISOString() } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get document");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/documents", async (req, res) => {
  try {
    const parsed = insertDocumentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.insert(documentsTable).values(parsed.data).returning();
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, record.employeeId));
    res.status(201).json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      employee: employee ? { ...employee, createdAt: employee.createdAt.toISOString() } : null,
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
    const [deleted] = await db.delete(documentsTable).where(eq(documentsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Document not found" });
    res.json({ message: "Document deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete document");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
