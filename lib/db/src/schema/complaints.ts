import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const complaintsTable = pgTable("complaints", {
  id: serial("id").primaryKey(),
  namaPelanggan: text("nama_pelanggan").notNull(),
  kontakPelanggan: text("kontak_pelanggan"),
  kategori: text("kategori", { enum: ["produk", "layanan", "pengiriman", "lainnya"] }).notNull(),
  jenisPelanggan: text("jenis_pelanggan", { enum: ["perorangan", "SPBU", "industri"] }).notNull().default("perorangan"),
  judul: text("judul").notNull(),
  deskripsi: text("deskripsi").notNull(),
  status: text("status", { enum: ["baru", "diproses", "selesai", "ditolak"] }).notNull().default("baru"),
  prioritas: text("prioritas", { enum: ["rendah", "sedang", "tinggi"] }).notNull().default("sedang"),
  tanggal: text("tanggal").notNull(),
  penangananOleh: text("penanganan_oleh"),
  catatanPenanganan: text("catatan_penanganan"),
  // Additional fields for SPBU and industri customer types
  spbuNumber: text("spbu_number"),
  spbuName: text("spbu_name"),
  industryName: text("industry_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertComplaintSchema = createInsertSchema(complaintsTable).omit({ id: true, createdAt: true });
export type InsertComplaint = z.infer<typeof insertComplaintSchema>;
export type Complaint = typeof complaintsTable.$inferSelect;
