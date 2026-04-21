import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSettings } from "@/lib/settings-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Building2, Image as ImageIcon, Save, Trash2, Upload, ShieldAlert, Settings2 } from "lucide-react";

const base = () => (import.meta.env.BASE_URL || "/").replace(/\/$/, "");

export default function PengaturanAplikasi() {
  const { isAdmin } = useAuth();
  const { settings, refresh } = useSettings();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [appName, setAppName] = useState("");
  const [appSubtitle, setAppSubtitle] = useState("");
  const [appDescription, setAppDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setAppName(settings.appName);
      setAppSubtitle(settings.appSubtitle);
      setAppDescription(settings.appDescription);
    }
  }, [settings]);

  if (!isAdmin()) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="p-10 flex flex-col items-center text-center gap-3">
          <ShieldAlert className="h-10 w-10 text-destructive" />
          <h2 className="text-xl font-bold">Akses Ditolak</h2>
          <p className="text-muted-foreground text-sm">
            Halaman pengaturan aplikasi hanya dapat diakses oleh administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch(`${base()}/api/settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appName, appSubtitle, appDescription }),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      await refresh();
      toast({ title: "Berhasil", description: "Pengaturan aplikasi diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${base()}/api/settings/logo`, { method: "POST", body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Gagal mengupload logo");
      }
      await refresh();
      toast({ title: "Berhasil", description: "Logo diperbarui" });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Hapus logo saat ini?")) return;
    try {
      const res = await fetch(`${base()}/api/settings/logo`, { method: "DELETE" });
      if (!res.ok) throw new Error("Gagal menghapus logo");
      await refresh();
      toast({ title: "Berhasil", description: "Logo dihapus" });
    } catch (err: any) {
      toast({ title: "Gagal", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Pengaturan Aplikasi</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Atur identitas aplikasi: nama, sub-judul, deskripsi & logo. Khusus admin.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Logo */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-4 w-4" />
              Logo Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-square w-full rounded-2xl border-2 border-dashed bg-muted/30 flex items-center justify-center overflow-hidden">
              {settings?.logoPath ? (
                <img
                  src={settings.logoPath}
                  alt="Logo aplikasi"
                  className="max-h-full max-w-full object-contain p-4"
                />
              ) : (
                <div className="flex flex-col items-center text-muted-foreground gap-2">
                  <Building2 className="h-16 w-16 opacity-40" />
                  <span className="text-xs">Belum ada logo</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp,image/gif"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isUploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Mengupload..." : "Upload Logo Baru"}
              </Button>
              {settings?.logoPath && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRemoveLogo}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Hapus Logo
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Format: PNG / JPG / SVG / WebP / GIF, maksimal 2 MB. Disarankan rasio kotak (1:1).
            </p>
          </CardContent>
        </Card>

        {/* Profil aplikasi */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Profil Aplikasi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="appName">Nama Aplikasi</Label>
                <Input
                  id="appName"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  placeholder="contoh: SI Kepegawaian"
                  maxLength={80}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="appSubtitle">Sub-judul / Tagline</Label>
                <Input
                  id="appSubtitle"
                  value={appSubtitle}
                  onChange={(e) => setAppSubtitle(e.target.value)}
                  placeholder="contoh: ENTERPRISE"
                  maxLength={60}
                />
                <p className="text-xs text-muted-foreground">
                  Tampil di bawah nama aplikasi pada sidebar dan halaman login.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="appDescription">Deskripsi Aplikasi</Label>
                <Textarea
                  id="appDescription"
                  value={appDescription}
                  onChange={(e) => setAppDescription(e.target.value)}
                  rows={4}
                  placeholder="Deskripsi singkat tentang aplikasi"
                  maxLength={400}
                />
                <p className="text-xs text-muted-foreground">
                  Tampil di halaman login (panel kiri).
                </p>
              </div>
              <div className="flex justify-end">
                <Button type="submit" disabled={isSaving} className="gap-2">
                  <Save className="h-4 w-4" />
                  {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
