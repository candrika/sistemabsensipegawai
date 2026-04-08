import { Router, type IRouter } from "express";
import { db, documentsTable, employeesTable, insertDocumentSchema } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/documents/summary", async (req, res) => {
  try {
    const rows = await db
      .select({ type: documentsTable.type, count: count() })
      .from(documentsTable)
      .groupBy(documentsTable.type);
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

router.get("/documents", async (req, res) => {
  try {
    const { type } = req.query as { type?: string };
    const validTypes = ["IJIN", "DINAS", "SKMJ", "SURAT_TUGAS"];
    const conditions = [];
    if (type && validTypes.includes(type)) {
      conditions.push(eq(documentsTable.type, type as any));
    }

    const records = await db
      .select({
        id: documentsTable.id,
        employeeId: documentsTable.employeeId,
        type: documentsTable.type,
        nomorSurat: documentsTable.nomorSurat,
        perihal: documentsTable.perihal,
        tanggal: documentsTable.tanggal,
        status: documentsTable.status,
        keterangan: documentsTable.keterangan,
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
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(documentsTable.tanggal);

    res.json(records.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      employee: r.employee ? { ...r.employee, createdAt: r.employee.createdAt.toISOString() } : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get documents");
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
        status: documentsTable.status,
        keterangan: documentsTable.keterangan,
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
    res.json({
      ...record,
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
