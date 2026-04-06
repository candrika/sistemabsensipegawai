import { Router, type IRouter } from "express";
import { db, complaintsTable, insertComplaintSchema } from "@workspace/db";
import { eq, count, and } from "drizzle-orm";

const router: IRouter = Router();

router.get("/complaints/summary", async (req, res) => {
  try {
    const rows = await db
      .select({ status: complaintsTable.status, count: count() })
      .from(complaintsTable)
      .groupBy(complaintsTable.status);
    const summary = { baru: 0, diproses: 0, selesai: 0, ditolak: 0 };
    for (const row of rows) {
      if (row.status in summary) {
        (summary as any)[row.status] = Number(row.count);
      }
    }
    res.json(summary);
  } catch (err) {
    req.log.error({ err }, "Failed to get complaint summary");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/complaints", async (req, res) => {
  try {
    const { status, prioritas, kategori } = req.query as { status?: string; prioritas?: string; kategori?: string };
    const conditions = [];
    if (status && ["baru", "diproses", "selesai", "ditolak"].includes(status)) {
      conditions.push(eq(complaintsTable.status, status as any));
    }
    if (prioritas && ["rendah", "sedang", "tinggi"].includes(prioritas)) {
      conditions.push(eq(complaintsTable.prioritas, prioritas as any));
    }
    if (kategori && ["produk", "layanan", "pengiriman", "lainnya"].includes(kategori)) {
      conditions.push(eq(complaintsTable.kategori, kategori as any));
    }

    const records = await db.select().from(complaintsTable)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(complaintsTable.tanggal);

    res.json(records.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get complaints");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/complaints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [record] = await db.select().from(complaintsTable).where(eq(complaintsTable.id, id));
    if (!record) return res.status(404).json({ message: "Complaint not found" });
    res.json({ ...record, createdAt: record.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get complaint");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/complaints", async (req, res) => {
  try {
    const parsed = insertComplaintSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.insert(complaintsTable).values(parsed.data).returning();
    res.status(201).json({ ...record, createdAt: record.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create complaint");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/complaints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = insertComplaintSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.update(complaintsTable).set(parsed.data).where(eq(complaintsTable.id, id)).returning();
    if (!record) return res.status(404).json({ message: "Complaint not found" });
    res.json({ ...record, createdAt: record.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update complaint");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/complaints/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db.delete(complaintsTable).where(eq(complaintsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Complaint not found" });
    res.json({ message: "Complaint deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete complaint");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
