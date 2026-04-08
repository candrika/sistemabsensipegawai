import "dotenv/config";
import { db } from "./index";
import {
  rolesTable,
  permissionsTable,
  rolePermissionsTable,
  usersTable,
} from "./schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding roles...");

  const roles = [
    { name: "admin" as const, description: "Akses penuh ke semua fitur dan persetujuan izin" },
    { name: "pegawai" as const, description: "Hanya dapat melihat riwayat sendiri" },
    { name: "saler" as const, description: "Akses ke inventory dan pelanggan" },
    { name: "pelanggan" as const, description: "Dapat melihat riwayat pengaduan dan input pengaduan baru" },
  ];

  const insertedRoles: { id: number; name: string }[] = [];
  for (const role of roles) {
    const existing = await db.select().from(rolesTable).where(eq(rolesTable.name, role.name));
    if (existing.length === 0) {
      const [inserted] = await db.insert(rolesTable).values(role).returning();
      insertedRoles.push(inserted);
      console.log(`Role '${role.name}' created.`);
    } else {
      insertedRoles.push(existing[0]);
      console.log(`Role '${role.name}' already exists.`);
    }
  }

  console.log("Seeding permissions...");

  const permissions = [
    { resource: "employees", action: "read", description: "Lihat data pegawai" },
    { resource: "employees", action: "create", description: "Tambah pegawai baru" },
    { resource: "employees", action: "update", description: "Edit data pegawai" },
    { resource: "employees", action: "delete", description: "Hapus pegawai" },
    { resource: "attendance", action: "read", description: "Lihat data kehadiran" },
    { resource: "attendance", action: "create", description: "Tambah data kehadiran" },
    { resource: "attendance", action: "update", description: "Edit data kehadiran" },
    { resource: "attendance", action: "delete", description: "Hapus data kehadiran" },
    { resource: "attendance", action: "approve", description: "Setujui atau tolak izin kehadiran" },
    { resource: "documents", action: "read", description: "Lihat dokumen" },
    { resource: "documents", action: "create", description: "Buat dokumen baru" },
    { resource: "documents", action: "update", description: "Edit dokumen" },
    { resource: "documents", action: "delete", description: "Hapus dokumen" },
    { resource: "documents", action: "approve", description: "Setujui atau tolak dokumen" },
    { resource: "inventory", action: "read", description: "Lihat data inventory" },
    { resource: "inventory", action: "create", description: "Tambah item inventory" },
    { resource: "inventory", action: "update", description: "Edit item inventory" },
    { resource: "inventory", action: "delete", description: "Hapus item inventory" },
    { resource: "complaints", action: "read", description: "Lihat semua pengaduan" },
    { resource: "complaints", action: "read_own", description: "Lihat pengaduan sendiri" },
    { resource: "complaints", action: "create", description: "Buat pengaduan baru" },
    { resource: "complaints", action: "update", description: "Edit pengaduan" },
    { resource: "complaints", action: "delete", description: "Hapus pengaduan" },
    { resource: "customers", action: "read", description: "Lihat data pelanggan" },
    { resource: "customers", action: "create", description: "Tambah pelanggan baru" },
    { resource: "customers", action: "update", description: "Edit data pelanggan" },
    { resource: "customers", action: "delete", description: "Hapus pelanggan" },
    { resource: "sellers", action: "read", description: "Lihat data penjual" },
    { resource: "sellers", action: "create", description: "Tambah penjual baru" },
    { resource: "sellers", action: "update", description: "Edit data penjual" },
    { resource: "sellers", action: "delete", description: "Hapus penjual" },
    { resource: "users", action: "read", description: "Lihat data pengguna" },
    { resource: "users", action: "create", description: "Buat pengguna baru" },
    { resource: "users", action: "update", description: "Edit pengguna" },
    { resource: "users", action: "delete", description: "Hapus pengguna" },
    { resource: "roles", action: "read", description: "Lihat data roles" },
    { resource: "roles", action: "manage", description: "Kelola roles dan permissions" },
  ];

  const insertedPermissions: { id: number; resource: string; action: string }[] = [];
  for (const perm of permissions) {
    const existing = await db
      .select()
      .from(permissionsTable)
      .where(eq(permissionsTable.resource, perm.resource));
    const found = existing.find((p) => p.action === perm.action);
    if (!found) {
      const [inserted] = await db.insert(permissionsTable).values(perm).returning();
      insertedPermissions.push(inserted);
    } else {
      insertedPermissions.push(found);
    }
  }
  console.log(`${insertedPermissions.length} permissions ready.`);

  const getRole = (name: string) => insertedRoles.find((r) => r.name === name)!;
  const getPerm = (resource: string, action: string) =>
    insertedPermissions.find((p) => p.resource === resource && p.action === action)!;

  console.log("Assigning permissions to roles...");

  const rolePermissions: { roleName: string; resource: string; action: string }[] = [
    // Admin - akses penuh
    { roleName: "admin", resource: "employees", action: "read" },
    { roleName: "admin", resource: "employees", action: "create" },
    { roleName: "admin", resource: "employees", action: "update" },
    { roleName: "admin", resource: "employees", action: "delete" },
    { roleName: "admin", resource: "attendance", action: "read" },
    { roleName: "admin", resource: "attendance", action: "create" },
    { roleName: "admin", resource: "attendance", action: "update" },
    { roleName: "admin", resource: "attendance", action: "delete" },
    { roleName: "admin", resource: "attendance", action: "approve" },
    { roleName: "admin", resource: "documents", action: "read" },
    { roleName: "admin", resource: "documents", action: "create" },
    { roleName: "admin", resource: "documents", action: "update" },
    { roleName: "admin", resource: "documents", action: "delete" },
    { roleName: "admin", resource: "documents", action: "approve" },
    { roleName: "admin", resource: "inventory", action: "read" },
    { roleName: "admin", resource: "inventory", action: "create" },
    { roleName: "admin", resource: "inventory", action: "update" },
    { roleName: "admin", resource: "inventory", action: "delete" },
    { roleName: "admin", resource: "complaints", action: "read" },
    { roleName: "admin", resource: "complaints", action: "create" },
    { roleName: "admin", resource: "complaints", action: "update" },
    { roleName: "admin", resource: "complaints", action: "delete" },
    { roleName: "admin", resource: "customers", action: "read" },
    { roleName: "admin", resource: "customers", action: "create" },
    { roleName: "admin", resource: "customers", action: "update" },
    { roleName: "admin", resource: "customers", action: "delete" },
    { roleName: "admin", resource: "sellers", action: "read" },
    { roleName: "admin", resource: "sellers", action: "create" },
    { roleName: "admin", resource: "sellers", action: "update" },
    { roleName: "admin", resource: "sellers", action: "delete" },
    { roleName: "admin", resource: "users", action: "read" },
    { roleName: "admin", resource: "users", action: "create" },
    { roleName: "admin", resource: "users", action: "update" },
    { roleName: "admin", resource: "users", action: "delete" },
    { roleName: "admin", resource: "roles", action: "read" },
    { roleName: "admin", resource: "roles", action: "manage" },

    // Pegawai - hanya lihat riwayat sendiri
    { roleName: "pegawai", resource: "attendance", action: "read" },
    { roleName: "pegawai", resource: "documents", action: "read" },

    // Saler - akses inventory, pelanggan, dan penjual
    { roleName: "saler", resource: "inventory", action: "read" },
    { roleName: "saler", resource: "inventory", action: "create" },
    { roleName: "saler", resource: "inventory", action: "update" },
    { roleName: "saler", resource: "customers", action: "read" },
    { roleName: "saler", resource: "customers", action: "create" },
    { roleName: "saler", resource: "customers", action: "update" },
    { roleName: "saler", resource: "sellers", action: "read" },
    { roleName: "saler", resource: "sellers", action: "create" },
    { roleName: "saler", resource: "sellers", action: "update" },
    { roleName: "saler", resource: "complaints", action: "read" },
    { roleName: "saler", resource: "complaints", action: "update" },

    // Pelanggan - lihat riwayat dan input pengaduan
    { roleName: "pelanggan", resource: "complaints", action: "read_own" },
    { roleName: "pelanggan", resource: "complaints", action: "create" },
  ];

  for (const rp of rolePermissions) {
    const role = getRole(rp.roleName);
    const perm = getPerm(rp.resource, rp.action);
    if (!role || !perm) {
      console.warn(`Skipping: ${rp.roleName} - ${rp.resource}:${rp.action}`);
      continue;
    }
    const existing = await db
      .select()
      .from(rolePermissionsTable)
      .where(eq(rolePermissionsTable.roleId, role.id));
    const found = existing.find((rpe) => rpe.permissionId === perm.id);
    if (!found) {
      await db.insert(rolePermissionsTable).values({ roleId: role.id, permissionId: perm.id });
    }
  }
  console.log("Role permissions assigned.");

  console.log("Creating default admin user...");
  const adminRole = getRole("admin");
  const existingAdmin = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.username, "admin"));
  if (existingAdmin.length === 0) {
    await db.insert(usersTable).values({
      username: "admin",
      password: "admin123",
      roleId: adminRole.id,
    });
    console.log("Default admin user created (username: admin, password: admin123).");
  } else {
    console.log("Admin user already exists.");
  }

  console.log("Seed completed successfully.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
