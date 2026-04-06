import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rolesTable } from "./roles";

export const permissionsTable = pgTable("permissions", {
  id: serial("id").primaryKey(),
  resource: text("resource").notNull(),
  action: text("action").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("permissions_resource_action_unique").on(t.resource, t.action),
]);

export const rolePermissionsTable = pgTable("role_permissions", {
  id: serial("id").primaryKey(),
  roleId: integer("role_id").notNull().references(() => rolesTable.id, { onDelete: "cascade" }),
  permissionId: integer("permission_id").notNull().references(() => permissionsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  unique("role_permissions_unique").on(t.roleId, t.permissionId),
]);

export const insertPermissionSchema = createInsertSchema(permissionsTable).omit({ id: true, createdAt: true });
export const insertRolePermissionSchema = createInsertSchema(rolePermissionsTable).omit({ id: true, createdAt: true });
export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissionsTable.$inferSelect;
export type RolePermission = typeof rolePermissionsTable.$inferSelect;
