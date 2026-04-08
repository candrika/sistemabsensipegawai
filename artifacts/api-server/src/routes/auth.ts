import { Router, type IRouter } from "express";
import { db, usersTable, rolesTable, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const router: IRouter = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: "Username dan password wajib diisi" });
    }

    const [user] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        password: usersTable.password,
        roleId: usersTable.roleId,
        roleName: rolesTable.name,
        roleDescription: rolesTable.description,
        employeeId: usersTable.employeeId,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.username, username));

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Username atau password salah" });
    }

    const permissions = await db
      .select({ resource: permissionsTable.resource, action: permissionsTable.action })
      .from(rolePermissionsTable)
      .leftJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
      .where(eq(rolePermissionsTable.roleId, user.roleId));

    res.json({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
      roleDescription: user.roleDescription,
      employeeId: user.employeeId,
      permissions: permissions.map(p => `${p.resource}:${p.action}`),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to login");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/auth/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const b64 = authHeader.slice(6);
    const [username, password] = Buffer.from(b64, "base64").toString().split(":");

    const [user] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        password: usersTable.password,
        roleId: usersTable.roleId,
        roleName: rolesTable.name,
        roleDescription: rolesTable.description,
        employeeId: usersTable.employeeId,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.username, username));

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const permissions = await db
      .select({ resource: permissionsTable.resource, action: permissionsTable.action })
      .from(rolePermissionsTable)
      .leftJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
      .where(eq(rolePermissionsTable.roleId, user.roleId));

    res.json({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      roleName: user.roleName,
      roleDescription: user.roleDescription,
      employeeId: user.employeeId,
      permissions: permissions.map(p => `${p.resource}:${p.action}`),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get me");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
