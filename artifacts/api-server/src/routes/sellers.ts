import { Router, type IRouter } from "express";
import { db, sellersTable, insertSellerSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/sellers", async (req, res) => {
  try {
    const records = await db.select().from(sellersTable).orderBy(sellersTable.createdAt);
    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Failed to get sellers");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/sellers", async (req, res) => {
  try {
    const parsed = insertSellerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.insert(sellersTable).values(parsed.data).returning();
    res.status(201).json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to create seller");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/sellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = insertSellerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.update(sellersTable).set(parsed.data).where(eq(sellersTable.id, id)).returning();
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to update seller");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/sellers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db.delete(sellersTable).where(eq(sellersTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete seller");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
