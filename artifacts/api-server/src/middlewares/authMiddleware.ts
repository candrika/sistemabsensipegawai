import { Request, Response, NextFunction } from "express";
import { db, usersTable, rolesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export default async function attachUserFromBasicAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Basic ")) {
      return next();
    }

    const b64 = authHeader.slice(6);
    const [username, password] = Buffer.from(b64, "base64").toString().split(":");
    if (!username) return next();

    const [user] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        roleId: usersTable.roleId,
        roleName: rolesTable.name,
        employeeId: usersTable.employeeId,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.username, username));

    if (user) {
      // attach minimal user object to request for downstream handlers
      (req as any).user = {
        id: user.id,
        username: user.username,
        roleId: user.roleId,
        roleName: user.roleName,
        employeeId: user.employeeId,
      };
    }

    return next();
  } catch (err) {
    // If anything goes wrong, do not block requests; just continue without user
    return next();
  }
}
