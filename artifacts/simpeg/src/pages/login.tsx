import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Building2, Eye, EyeOff, LogIn, ShieldCheck } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setIsLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login Gagal", description: err.message || "Periksa username dan password", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const demoAccounts = [
    { username: "admin", password: "admin123", role: "Admin", color: "bg-violet-100 text-violet-700 border-violet-200" },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      {/* Left side - Branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="font-extrabold text-lg tracking-tight">SI Kepegawaian</p>
            <p className="text-white/50 text-xs">ENTERPRISE</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight leading-tight">
              Sistem Informasi<br />
              <span className="text-indigo-400">Kepegawaian</span>
            </h1>
            <p className="text-white/60 mt-4 text-lg leading-relaxed">
              Platform terintegrasi untuk pengelolaan data pegawai, kehadiran, dokumen, inventori, dan keluhan pelanggan.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Multi Role", desc: "Admin, Pegawai, Saler, Pelanggan", icon: ShieldCheck },
              { label: "Approval Izin", desc: "Persetujuan kehadiran real-time", icon: LogIn },
            ].map(({ label, desc, icon: Icon }) => (
              <div key={label} className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <Icon className="h-5 w-5 text-indigo-400 mb-2" />
                <p className="font-bold text-sm">{label}</p>
                <p className="text-white/50 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-sm">© 2026 Sistem Informasi Kepegawaian</p>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="font-extrabold text-lg text-white">SI Kepegawaian</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-white">Selamat Datang</h2>
              <p className="text-white/50 mt-1">Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-white/80 font-medium">Username</Label>
                <Input
                  type="text"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl focus:border-indigo-400 focus:ring-indigo-400/20"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label className="text-white/80 font-medium">Password</Label>
                <div className="relative">
                  <Input
                    type={showPwd ? "text" : "password"}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-12 rounded-xl pr-12 focus:border-indigo-400 focus:ring-indigo-400/20"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors"
                  >
                    {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base shadow-lg shadow-indigo-900/40 gap-2 transition-all"
              >
                {isLoading ? (
                  <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <LogIn className="h-5 w-5" />
                )}
                {isLoading ? "Memproses..." : "Masuk"}
              </Button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <p className="text-white/40 text-xs text-center mb-3">Akun demo tersedia</p>
              <div className="space-y-2">
                {demoAccounts.map(acc => (
                  <button
                    key={acc.username}
                    type="button"
                    onClick={() => { setUsername(acc.username); setPassword(acc.password); }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-left"
                  >
                    <div>
                      <p className="text-white text-sm font-bold">{acc.username}</p>
                      <p className="text-white/40 text-xs">password: {acc.password}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${acc.color}`}>
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
