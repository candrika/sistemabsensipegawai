import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const documentTypeEnum = ["IJIN", "DINAS", "SKMJ", "SURAT_TUGAS"] as const;
export const documentStatusEnum = ["pending", "approved", "rejected"] as const;

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  type: text("type", { enum: documentTypeEnum }).notNull(),
  nomorSurat: text("nomor_surat"),
  perihal: text("perihal"),
  tanggal: text("tanggal").notNull(),
  status: text("status", { enum: documentStatusEnum }).notNull().default("pending"),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
