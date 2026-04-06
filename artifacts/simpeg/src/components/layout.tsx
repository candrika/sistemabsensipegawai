import { Link, useLocation } from "wouter";
import { 
  Building2, 
  Users, 
  Clock, 
  FileText, 
  Menu,
  Package,
  MessageSquareWarning,
  LayoutDashboard,
  ShieldCheck,
  LogOut,
  ChevronDown,
  UserCog 
} from "lucide-react";
import { ReactNode, useState } from "react";
import { Button } from "./ui/button";
import { useAuth } from "@/lib/auth-context";

const ROLE_COLORS: Record<string, string> = {
  admin: "from-violet-500 to-indigo-600",
  pegawai: "from-blue-500 to-cyan-600",
  saler: "from-emerald-500 to-teal-600",
  pelanggan: "from-orange-500 to-amber-600",
};

const ALL_NAV = [
  { name: "Dashboard Utama", href: "/", icon: LayoutDashboard, roles: ["admin", "pegawai", "saler", "pelanggan"] },
  { name: "Data Pekerja", href: "/karyawan", icon: Users, roles: ["admin", "pegawai"] },
  { name: "Rekap Kehadiran", href: "/absensi", icon: Clock, roles: ["admin", "pegawai"] },
  { name: "Menu Dokumen", href: "/dokumen", icon: FileText, roles: ["admin", "pegawai"] },
  { name: "Inventori", href: "/inventori", icon: Package, roles: ["admin", "saler"] },
  { name: "Keluhan Pelanggan", href: "/keluhan", icon: MessageSquareWarning, roles: ["admin", "saler", "pelanggan"] },
  { name: "Role & Permission", href: "/role-manager", icon: ShieldCheck, roles: ["admin"] },
  { name: "User Manager", href: "/user-manager", icon: UserCog, roles: ["admin"] },
];

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();

  const roleName = user?.roleName ?? "pegawai";
  const gradientColor = ROLE_COLORS[roleName] ?? "from-indigo-500 to-purple-600";
  const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??";

  const navigation = ALL_NAV.filter(item => item.roles.includes(roleName));
  const mainNav = navigation.filter(item => ["Dashboard Utama", "Data Pekerja", "Rekap Kehadiran", "Menu Dokumen"].includes(item.name));
  const serviceNav = navigation.filter(item => !["Dashboard Utama", "Data Pekerja", "Rekap Kehadiran", "Menu Dokumen"].includes(item.name));

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground font-sans selection:bg-primary/20">
      {/* Desktop Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-r-0 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:flex`}>
        <div className="h-20 flex items-center px-6 bg-black/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-indigo-400 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight leading-none">SI Kepegawaian</h1>
              <p className="text-[10px] text-indigo-300 font-bold mt-1 uppercase tracking-widest">Enterprise</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">
          {mainNav.length > 0 && (
            <>
              <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 px-2">Menu Utama</div>
              {mainNav.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link 
                    key={item.name}
                    href={item.href} 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? "bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/20 scale-[1.02]" 
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-white/60"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}

          {serviceNav.length > 0 && (
            <>
              <div className="my-4 border-t border-white/10 mx-2 pt-4">
                <div className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Layanan</div>
              </div>
              {serviceNav.map((item) => {
                const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                return (
                  <Link 
                    key={item.name}
                    href={item.href} 
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive 
                        ? "bg-gradient-to-r from-primary to-indigo-600 text-white shadow-md shadow-primary/20 scale-[1.02]" 
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${isActive ? "text-white" : "text-white/60"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </>
          )}
        </nav>
        
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3 px-2 py-1.5">
            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-bold shadow-inner border border-white/10 flex-shrink-0`}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.username}</p>
              <p className="text-xs text-white/50 capitalize">{user?.roleName}</p>
            </div>
            <button
              onClick={logout}
              className="text-white/40 hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-white/10"
              title="Keluar"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-muted/30">
        <header className="h-20 flex items-center px-4 md:px-8 border-b bg-card/80 backdrop-blur-md justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="md:hidden rounded-xl border-border" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-semibold text-lg md:hidden">SIK Enterprise</div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-sm font-medium hidden md:block text-muted-foreground mr-2">
              Sistem Informasi Terpadu
            </div>
            <div className={`md:hidden h-10 w-10 rounded-full bg-gradient-to-br ${gradientColor} text-white flex items-center justify-center text-sm font-bold shadow-md`}>
              {initials}
            </div>
            {/* <button
              onClick={logout}
              className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-red-500 transition-colors px-3 py-2 rounded-xl hover:bg-red-50 border border-transparent hover:border-red-100"
            >
              <LogOut className="h-4 w-4" />
              Keluar
            </button> */}
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
