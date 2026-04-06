import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const inventoryItemsTable = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  kodeBarang: text("kode_barang").notNull().unique(),
  namaBarang: text("nama_barang").notNull(),
  kategori: text("kategori"),
  satuan: text("satuan"),
  stok: integer("stok").notNull().default(0),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryTransactionsTable = pgTable("inventory_transactions", {
  id: serial("id").primaryKey(),
  itemId: integer("item_id").notNull().references(() => inventoryItemsTable.id, { onDelete: "cascade" }),
  tipe: text("tipe", { enum: ["masuk", "keluar"] }).notNull(),
  jumlah: integer("jumlah").notNull(),
  tanggal: text("tanggal").notNull(),
  keterangan: text("keterangan"),
  penanggungJawab: text("penanggung_jawab"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInventoryItemSchema = createInsertSchema(inventoryItemsTable).omit({ id: true, createdAt: true });
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryItem = typeof inventoryItemsTable.$inferSelect;

export const insertInventoryTransactionSchema = createInsertSchema(inventoryTransactionsTable).omit({ id: true, createdAt: true });
export type InsertInventoryTransaction = z.infer<typeof insertInventoryTransactionSchema>;
export type InventoryTransaction = typeof inventoryTransactionsTable.$inferSelect;
