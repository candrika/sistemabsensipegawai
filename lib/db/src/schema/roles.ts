import { pgTable, text, serial, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const roleNameEnum = pgEnum("role_name", ["admin", "pegawai", "saler", "pelanggan"]);

export const rolesTable = pgTable("roles", {
  id: serial("id").primaryKey(),
  name: roleNameEnum("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRoleSchema = createInsertSchema(rolesTable).omit({ id: true, createdAt: true });
export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof rolesTable.$inferSelect;
