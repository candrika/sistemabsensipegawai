import { Router, type IRouter } from "express";
import {
  db,
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

// =====================
// GET ROLES
// =====================
router.get("/roles", async (req, res) => {
  try {
    const roles = await db.select().from(rolesTable).orderBy(rolesTable.id);
    res.json(roles.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get roles");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// GET ROLE BY ID
// =====================
router.get("/roles/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, id));

    if (!role) return res.status(404).json({ message: "Role not found" });

    res.json({ ...role, createdAt: role.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get role");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// GET ROLE PERMISSIONS
// =====================
router.get("/roles/:id/permissions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const rows = await db
      .select({
        id: permissionsTable.id,
        resource: permissionsTable.resource,
        action: permissionsTable.action,
        description: permissionsTable.description,
        createdAt: permissionsTable.createdAt,
      })
      .from(rolePermissionsTable)
      .innerJoin(
        permissionsTable,
        eq(rolePermissionsTable.permissionId, permissionsTable.id)
      )
      .where(eq(rolePermissionsTable.roleId, id));

    res.json(rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get role permissions");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// GET ALL PERMISSIONS
// =====================
router.get("/permissions", async (req, res) => {
  try {
    const perms = await db
      .select()
      .from(permissionsTable)
      .orderBy(permissionsTable.resource, permissionsTable.action);

    res.json(perms.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })));
  } catch (err) {
    req.log.error({ err }, "Failed to get permissions");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// ASSIGN PERMISSION (1 BY 1)
// =====================
router.post("/roles/:id/permissions/:permissionId", async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const permissionId = parseInt(req.params.permissionId);

    if (isNaN(roleId) || isNaN(permissionId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const [inserted] = await db
      .insert(rolePermissionsTable)
      .values({ roleId, permissionId })
      .onConflictDoNothing()
      .returning();

    res.status(201).json(
      inserted
        ? { ...inserted, createdAt: inserted.createdAt.toISOString() }
        : { message: "Already assigned" }
    );
  } catch (err) {
    req.log.error({ err }, "Failed to assign permission");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// REMOVE PERMISSION (FIXED)
// =====================
router.delete("/roles/:id/permissions/:permissionId", async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const permissionId = parseInt(req.params.permissionId);

    if (isNaN(roleId) || isNaN(permissionId)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    await db
      .delete(rolePermissionsTable)
      .where(
        and(
          eq(rolePermissionsTable.roleId, roleId),
          eq(rolePermissionsTable.permissionId, permissionId)
        )
      );

    res.json({ message: "Permission removed from role" });
  } catch (err) {
    req.log.error({ err }, "Failed to remove permission");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;