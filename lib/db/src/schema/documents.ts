import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";
import { attendanceTable } from "./attendance";
import { eq, and, sql, desc, or } from "drizzle-orm";


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
  filePath: text("file_path"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expirationDate: date("expiration_date"),
  // expirationDate: date("expiration_date"), 
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
