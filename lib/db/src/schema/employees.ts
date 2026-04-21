import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const STATUS_PEKERJA = ["Organik", "TAD", "Medical", "Security", "Mitra Kerja", "Driver", "CS", "Gardener"] as const;
export const STATUS_BEKERJA = ["Aktif", "Mutasi", "Pensiun", "PHK", "Mengundurkan Diri"] as const;

export type StatusPekerja = (typeof STATUS_PEKERJA)[number];
export type StatusBekerja = (typeof STATUS_BEKERJA)[number];

export const employeesTable = pgTable("employees", {
  id: serial("id").primaryKey(),
  nama: text("nama").notNull(),
  nopek: text("nopek").notNull().unique(),
  foto: text("foto"),
  jabatan: text("jabatan"),
  departemen: text("departemen"),
  fungsi: text("fungsi"),
  lokasi_kerja: text("lokasi_kerja"),
  nomor_telepon: text("nomor_telepon"),
  status_pekerja: text("status_pekerja").$type<StatusPekerja>(),
  status_bekerja: text("status_bekerja").$type<StatusBekerja>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEmployeeSchema = createInsertSchema(employeesTable).omit({ id: true, createdAt: true });
export type InsertEmployee = z.infer<typeof insertEmployeeSchema>;
export type Employee = typeof employeesTable.$inferSelect;
