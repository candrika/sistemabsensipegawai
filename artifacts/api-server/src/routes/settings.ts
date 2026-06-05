import { Router, type IRouter } from "express";
import multer, { type FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";
import { eq } from "drizzle-orm";
import { db, pool, appSettingsTable, updateAppSettingsSchema } from "@workspace/db";

const router: IRouter = Router();

const LOGO_DIR = "uploads/branding";
fs.mkdirSync(LOGO_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (
    _req: unknown,
    file: { mimetype: string },
    cb: (error: Error | null, acceptFile?: boolean) => void,
  ) => {
    const ok = /^image\/(png|jpeg|jpg|svg\+xml|webp|gif)$/.test(file.mimetype);
    cb(ok ? null : new Error("File harus berupa gambar (PNG/JPG/SVG/WebP/GIF)"), ok);
  },
});

function eqId(id: number) {
  return eq(appSettingsTable.id, id);
}

async function ensureAppSettingsTableExists() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      id SERIAL PRIMARY KEY,
      app_name text NOT NULL DEFAULT 'SI Kepegawaian',
      app_subtitle text NOT NULL DEFAULT 'ENTERPRISE',
      app_description text NOT NULL DEFAULT 'Platform terintegrasi untuk pengelolaan data pegawai, kehadiran, dokumen, inventori, dan keluhan pelanggan.',
      logo_path text,
      updated_at timestamp NOT NULL DEFAULT now()
    );
  `);
}

async function getOrCreateSettings() {
  await ensureAppSettingsTableExists();
  const rows = await db.select().from(appSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [created] = await db.insert(appSettingsTable).values({}).returning();
  return created;
}

router.get("/settings", async (req, res) => {
  try {
    const s = await getOrCreateSettings();
    res.json({ ...s, updatedAt: s.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to get app settings");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const parsed = updateAppSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Validation failed", errors: parsed.error.issues });
    }
    const current = await getOrCreateSettings();
    const [updated] = await db
      .update(appSettingsTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eqId(current.id))
      .returning();
    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to update app settings");
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/settings/logo", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "File diperlukan" });
    const current = await getOrCreateSettings();

    // hapus logo lama jika ada (hanya yang berada di LOGO_DIR)
    if (current.logoPath && current.logoPath.startsWith(`/${LOGO_DIR}/`)) {
      const oldFile = current.logoPath.replace(/^\//, "");
      fs.promises.unlink(oldFile).catch(() => {});
    }

    const logoPath = `/${LOGO_DIR}/${req.file.filename}`;
    const [updated] = await db
      .update(appSettingsTable)
      .set({ logoPath, updatedAt: new Date() })
      .where(eqId(current.id))
      .returning();
    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to upload logo");
    res.status(500).json({ message: err instanceof Error ? err.message : "Internal server error" });
  }
});

router.delete("/settings/logo", async (req, res) => {
  try {
    const current = await getOrCreateSettings();
    if (current.logoPath && current.logoPath.startsWith(`/${LOGO_DIR}/`)) {
      fs.promises.unlink(current.logoPath.replace(/^\//, "")).catch(() => {});
    }
    const [updated] = await db
      .update(appSettingsTable)
      .set({ logoPath: null, updatedAt: new Date() })
      .where(eqId(current.id))
      .returning();
    res.json({ ...updated, updatedAt: updated.updatedAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "Failed to remove logo");
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
