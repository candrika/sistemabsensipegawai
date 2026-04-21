import { Request, Response, NextFunction } from "express";
import { db, permissionsTable, rolePermissionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/**
 * Middleware untuk memvalidasi permission pengguna.
 * @param resource - Nama resource yang akan diakses.
 * @param action - Aksi yang akan dilakukan pada resource.
 */
export function validatePermission(resource: string, action: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user; // Asumsikan user sudah di-set oleh middleware autentikasi

      if (!user || !user.roleId) {
        return res.status(403).json({ message: "Akses ditolak. Pengguna tidak valid." });
      }

      const [permission] = await db
        .select()
        .from(rolePermissionsTable)
        .leftJoin(permissionsTable, eq(rolePermissionsTable.permissionId, permissionsTable.id))
        .where(eq(rolePermissionsTable.roleId, user.roleId))
        .andWhere(eq(permissionsTable.resource, resource))
        .andWhere(eq(permissionsTable.action, action));

      if (!permission) {
        return res.status(403).json({ message: "Akses ditolak. Anda tidak memiliki izin." });
      }

      next();
    } catch (err) {
      req.log.error({ err }, "Gagal memvalidasi permission");
      res.status(500).json({ message: "Terjadi kesalahan pada server." });
    }
  };
}