import { Router, type IRouter } from "express";
import { db, usersTable, rolesTable, insertUserSchema } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const router: IRouter = Router();

// =====================
// GET ALL USERS
// =====================
router.get("/users", async (req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        roleId: usersTable.roleId,
        roleName: rolesTable.name,
        employeeId: usersTable.employeeId,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .orderBy(usersTable.username);

    res.json(
      users.map((u) => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error({ err }, "Failed to get users");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// GET USER BY ID
// =====================
router.get("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const [user] = await db
      .select({
        id: usersTable.id,
        username: usersTable.username,
        roleId: usersTable.roleId,
        roleName: rolesTable.name,
        employeeId: usersTable.employeeId,
        createdAt: usersTable.createdAt,
        updatedAt: usersTable.updatedAt,
      })
      .from(usersTable)
      .leftJoin(rolesTable, eq(usersTable.roleId, rolesTable.id))
      .where(eq(usersTable.id, id));

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// CREATE USER (SECURE)
// =====================
router.post("/users", async (req, res) => {
  try {
    const parsed = insertUserSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues,
      });
    }

    const { password, ...rest } = parsed.data;

    // ✅ cek role valid
    const [role] = await db
      .select()
      .from(rolesTable)
      .where(eq(rolesTable.id, parsed.data.roleId));

    if (!role) {
      return res.status(400).json({ message: "Role not found" });
    }

    // 🔐 HASH PASSWORD
    const hashedPassword = await bcrypt.hash(password, 10);

    const [user] = await db
      .insert(usersTable)
      .values({
        ...rest,
        password: hashedPassword,
      })
      .returning();

    res.status(201).json({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      employeeId: user.employeeId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (err: any) {
    if (err?.code === "23505") {
      return res.status(409).json({ message: "Username already exists" });
    }

    req.log.error({ err }, "Failed to create user");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// UPDATE USER
// =====================
router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const parsed = insertUserSchema.partial().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parsed.error.issues,
      });
    }

    const updateData: any = { ...parsed.data };

    // 🔐 kalau password diupdate → hash lagi
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    const [user] = await db
      .update(usersTable)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(usersTable.id, id))
      .returning();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user.id,
      username: user.username,
      roleId: user.roleId,
      employeeId: user.employeeId,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "Failed to update user");
    res.status(500).json({ message: "Internal server error" });
  }
});

// =====================
// DELETE USER
// =====================
router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: "Invalid ID" });

    const [deleted] = await db
      .delete(usersTable)
      .where(eq(usersTable.id, id))
      .returning();

    if (!deleted) return res.status(404).json({ message: "User not found" });

    res.json({ message: "User deleted" });
  } catch (err) {
    req.log.error({ err }, "Failed to delete user");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;