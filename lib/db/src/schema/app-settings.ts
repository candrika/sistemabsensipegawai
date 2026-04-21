import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const appSettingsTable = pgTable("app_settings", {
  id: serial("id").primaryKey(),
  appName: text("app_name").notNull().default("SI Kepegawaian"),
  appSubtitle: text("app_subtitle").notNull().default("ENTERPRISE"),
  appDescription: text("app_description").notNull().default(
    "Platform terintegrasi untuk pengelolaan data pegawai, kehadiran, dokumen, inventori, dan keluhan pelanggan."
  ),
  logoPath: text("logo_path"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const updateAppSettingsSchema = createInsertSchema(appSettingsTable)
  .omit({ id: true, updatedAt: true, logoPath: true })
  .partial();

export type AppSettings = typeof appSettingsTable.$inferSelect;
export type UpdateAppSettings = z.infer<typeof updateAppSettingsSchema>;
