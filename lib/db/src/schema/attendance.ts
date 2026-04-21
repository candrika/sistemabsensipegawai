import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { employeesTable } from "./employees";

export const attendanceStatusEnum = ["izin", "cuti", "dinas", "absen"] as const;

export const attendanceTable = pgTable("attendance", {
  id: serial("id").primaryKey(),
  employeeId: integer("employee_id").notNull().references(() => employeesTable.id, { onDelete: "cascade" }),
  status: text("status", { enum: attendanceStatusEnum }).notNull(),
  tglMulai: text("tgl_mulai").notNull(),
  tglAkhir: text("tgl_akhir").notNull(),
  dokumenPendukung: text("dokumen_pendukung"),
  alasan: text("alasan"),
  keterangan: text("keterangan"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // approvalStatus: text("approval_status", { enum: ["pending", "approved", "rejected"] }).default("pending").notNull(),
});

export const insertAttendanceSchema = createInsertSchema(attendanceTable).omit({ id: true, createdAt: true });
export type InsertAttendance = z.infer<typeof insertAttendanceSchema>;
export type Attendance = typeof attendanceTable.$inferSelect;
