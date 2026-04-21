import { Router, type IRouter } from "express";
import { db, employeesTable, insertEmployeeSchema } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/employees/stats", async (req, res) => {
  try {
    const [stats] = await db
      .select({
        total: sql<number>`count(*)::int`,
        // Status Bekerja counts
        aktif: sql<number>`count(*) filter (where status_bekerja = 'Aktif')::int`,
        mutasi: sql<number>`count(*) filter (where status_bekerja = 'Mutasi')::int`,
        pensiun: sql<number>`count(*) filter (where status_bekerja = 'Pensiun')::int`,
        phk: sql<number>`count(*) filter (where status_bekerja = 'PHK')::int`,
        mengundurkan_diri: sql<number>`count(*) filter (where status_bekerja = 'Mengundurkan Diri')::int`,
        // Status Pekerja counts
        organik: sql<number>`count(*) filter (where status_pekerja = 'Organik')::int`,
        tad: sql<number>`count(*) filter (where status_pekerja = 'TAD')::int`,
        tkjp: sql<number>`count(*) filter (where status_pekerja = 'Medical')::int`,
        security: sql<number>`count(*) filter (where status_pekerja = 'Security')::int`,
        mitra_kerja: sql<number>`count(*) filter (where status_pekerja = 'Mitra Kerja')::int`,
        driver: sql<number>`count(*) filter (where status_pekerja = 'Driver')::int`,
        cs: sql<number>`count(*) filter (where status_pekerja = 'CS')::int`,
        gardener: sql<number>`count(*) filter (where status_pekerja = 'Gardener')::int`,
      })
      .from(employeesTable);
    res.json(stats);
  } catch (err) {
    req.log.error({ err }, "Failed to get employee stats");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/employees", async (req, res) => {
  try {
    const employees = await db.select().from(employeesTable).orderBy(employeesTable.nama);
    res.json(employees.map(e => ({
      ...e,
      createdAt: e.createdAt.toISOString(),
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get employees");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [employee] = await db.select().from(employeesTable).where(eq(employeesTable.id, id));
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ ...employee, createdAt: employee.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get employee");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/employees", async (req, res) => {
  try {
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [employee] = await db.insert(employeesTable).values(parsed.data).returning();
    res.status(201).json({ ...employee, createdAt: employee.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create employee");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = insertEmployeeSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [employee] = await db.update(employeesTable).set(parsed.data).where(eq(employeesTable.id, id)).returning();
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ ...employee, createdAt: employee.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update employee");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/employees/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db.delete(employeesTable).where(eq(employeesTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete employee");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
