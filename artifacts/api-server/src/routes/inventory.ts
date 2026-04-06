import { Router, type IRouter } from "express";
import { db, inventoryItemsTable, inventoryTransactionsTable, insertInventoryItemSchema, insertInventoryTransactionSchema } from "@workspace/db";
import { eq, and, count, sum } from "drizzle-orm";

const router: IRouter = Router();

router.get("/inventory/summary", async (req, res) => {
  try {
    const [{ total }] = await db.select({ total: count() }).from(inventoryItemsTable);
    const masukRows = await db.select({ total: sum(inventoryTransactionsTable.jumlah) })
      .from(inventoryTransactionsTable)
      .where(eq(inventoryTransactionsTable.tipe, "masuk"));
    const keluarRows = await db.select({ total: sum(inventoryTransactionsTable.jumlah) })
      .from(inventoryTransactionsTable)
      .where(eq(inventoryTransactionsTable.tipe, "keluar"));
    res.json({
      totalItems: Number(total),
      totalMasuk: Number(masukRows[0]?.total ?? 0),
      totalKeluar: Number(keluarRows[0]?.total ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get inventory summary");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/inventory/items", async (req, res) => {
  try {
    const items = await db.select().from(inventoryItemsTable).orderBy(inventoryItemsTable.namaBarang);
    res.json(items.map(i => ({ ...i, createdAt: i.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get inventory items");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/inventory/items", async (req, res) => {
  try {
    const parsed = insertInventoryItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [item] = await db.insert(inventoryItemsTable).values(parsed.data).returning();
    res.status(201).json({ ...item, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to create inventory item");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/inventory/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const parsed = insertInventoryItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const [item] = await db.update(inventoryItemsTable).set(parsed.data).where(eq(inventoryItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.json({ ...item, createdAt: item.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update inventory item");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/inventory/items/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db.delete(inventoryItemsTable).where(eq(inventoryItemsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Item not found" });
    res.json({ message: "Item deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete inventory item");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/inventory/transactions", async (req, res) => {
  try {
    const { tipe, itemId } = req.query as { tipe?: string; itemId?: string };
    const conditions = [];
    if (tipe && ["masuk", "keluar"].includes(tipe)) {
      conditions.push(eq(inventoryTransactionsTable.tipe, tipe as any));
    }
    if (itemId) {
      const id = parseInt(itemId);
      if (!isNaN(id)) conditions.push(eq(inventoryTransactionsTable.itemId, id));
    }

    const records = await db
      .select({
        id: inventoryTransactionsTable.id,
        itemId: inventoryTransactionsTable.itemId,
        tipe: inventoryTransactionsTable.tipe,
        jumlah: inventoryTransactionsTable.jumlah,
        tanggal: inventoryTransactionsTable.tanggal,
        keterangan: inventoryTransactionsTable.keterangan,
        penanggungJawab: inventoryTransactionsTable.penanggungJawab,
        createdAt: inventoryTransactionsTable.createdAt,
        item: {
          id: inventoryItemsTable.id,
          kodeBarang: inventoryItemsTable.kodeBarang,
          namaBarang: inventoryItemsTable.namaBarang,
          kategori: inventoryItemsTable.kategori,
          satuan: inventoryItemsTable.satuan,
          stok: inventoryItemsTable.stok,
          keterangan: inventoryItemsTable.keterangan,
          createdAt: inventoryItemsTable.createdAt,
        },
      })
      .from(inventoryTransactionsTable)
      .leftJoin(inventoryItemsTable, eq(inventoryTransactionsTable.itemId, inventoryItemsTable.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(inventoryTransactionsTable.tanggal);

    res.json(records.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      item: r.item ? { ...r.item, createdAt: r.item.createdAt.toISOString() } : null,
    })));
  } catch (err) {
    req.log.error({ err }, "Failed to get inventory transactions");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/inventory/transactions", async (req, res) => {
  try {
    const parsed = insertInventoryTransactionSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    const { tipe, jumlah, itemId } = parsed.data;

    // Update stock
    const [item] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId));
    if (!item) return res.status(404).json({ message: "Inventory item not found" });

    const newStok = tipe === "masuk" ? item.stok + jumlah : item.stok - jumlah;
    if (newStok < 0) return res.status(400).json({ message: "Stok tidak mencukupi" });

    await db.update(inventoryItemsTable).set({ stok: newStok }).where(eq(inventoryItemsTable.id, itemId));
    const [record] = await db.insert(inventoryTransactionsTable).values(parsed.data).returning();
    const [updatedItem] = await db.select().from(inventoryItemsTable).where(eq(inventoryItemsTable.id, itemId));

    res.status(201).json({
      ...record,
      createdAt: record.createdAt.toISOString(),
      item: updatedItem ? { ...updatedItem, createdAt: updatedItem.createdAt.toISOString() } : null,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to create inventory transaction");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.delete("/inventory/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });
    const [deleted] = await db.delete(inventoryTransactionsTable).where(eq(inventoryTransactionsTable.id, id)).returning();
    if (!deleted) return res.status(404).json({ message: "Transaction not found" });
    res.json({ message: "Transaction deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete inventory transaction");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
