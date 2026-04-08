import { Router, type IRouter } from "express";
import { db, customersTable, insertCustomerSchema } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/customers", async (req, res) => {
  try {
    const records = await db.select().from(customersTable).orderBy(customersTable.createdAt);
    res.json(records);
  } catch (err) {
    req.log.error({ err }, "Failed to get customers");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/customers", async (req, res) => {
  try {
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.insert(customersTable).values(parsed.data).returning();
    res.status(201).json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to create customer");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = insertCustomerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [record] = await db.update(customersTable).set(parsed.data).where(eq(customersTable.id, id)).returning();
    if (!record) return res.status(404).json({ message: "Record not found" });
    res.json(record);
  } catch (err) {
    req.log.error({ err }, "Failed to update customer");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/customers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db.delete(customersTable).where(eq(customersTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Record not found" });
    res.json({ message: "Record deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete customer");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
