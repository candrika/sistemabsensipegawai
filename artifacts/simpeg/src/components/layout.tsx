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
  UserCog,
  DollarSign,
  Coins
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

  // MASTER DATA
  { name: "Data Pekerja", href: "/karyawan", icon: Users, roles: ["admin", "pegawai"], group: "master" },
  { name: "Data Pelanggan", href: "/pelanggan", icon: Users, roles: ["admin"], group: "master" },
  { name: "Data Penjual", href: "/penjual", icon: Users, roles: ["admin"], group: "master" },

  // MENU UTAMA LAIN
  { name: "Rekap Kehadiran", href: "/absensi", icon: Clock, roles: ["admin", "pegawai"] },
  { name: "Menu Dokumen", href: "/dokumen", icon: FileText, roles: ["admin", "pegawai"] },

  // SERVICE
  { name: "Inventori", href: "/inventori", icon: Package, roles: ["admin", "saler"] },
  { name: "Realisasi Anggaran", href: "/realisasi-anggaran", icon: Coins, roles: ["admin"] },
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

  const dashboardNav = navigation.filter(item => item.name === "Dashboard Utama");
  const masterNav = navigation.filter(item => item.group === "master");
  const mainNav = navigation.filter(item =>
    ["Rekap Kehadiran", "Menu Dokumen"].includes(item.name)
  );
  const serviceNav = navigation.filter(item =>
    !["Dashboard Utama", "Rekap Kehadiran", "Menu Dokumen"].includes(item.name) &&
    item.group !== "master"
  );

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground font-sans selection:bg-primary/20">
      
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 flex flex-col bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 shadow-2xl transition-transform duration-300 md:relative md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:flex`}>
        
        {/* Header */}
        <div className="h-20 flex items-center px-6 bg-black/20 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-indigo-400 rounded-xl flex items-center justify-center shadow-lg">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">SI Kepegawaian</h1>
              <p className="text-[10px] text-indigo-300 font-bold mt-1 uppercase">Enterprise</p>
            </div>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex-1 py-6 px-4 space-y-1.5 overflow-y-auto">

          {/* Dashboard */}
          {dashboardNav.map(item => (
            <NavItem key={item.name} item={item} location={location} close={() => setSidebarOpen(false)} />
          ))}

          {/* MASTER DATA */}
          {masterNav.length > 0 && (
            <>
              <div className="mt-4 text-xs font-semibold text-white/40 uppercase px-2">Master Data</div>
              {masterNav.map(item => (
                <NavItem key={item.name} item={item} location={location} close={() => setSidebarOpen(false)} />
              ))}
            </>
          )}

          {/* MENU UTAMA */}
          {mainNav.length > 0 && (
            <>
              <div className="mt-4 text-xs font-semibold text-white/40 uppercase px-2">Menu Utama</div>
              {mainNav.map(item => (
                <NavItem key={item.name} item={item} location={location} close={() => setSidebarOpen(false)} />
              ))}
            </>
          )}

          {/* LAYANAN */}
          {serviceNav.length > 0 && (
            <>
              <div className="mt-4 text-xs font-semibold text-white/40 uppercase px-2">Layanan</div>
              {serviceNav.map(item => (
                <NavItem key={item.name} item={item} location={location} close={() => setSidebarOpen(false)} />
              ))}
            </>
          )}
        </nav>

        {/* USER */}
        <div className="p-4 border-t border-white/10 bg-black/10">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${gradientColor} flex items-center justify-center text-white font-bold`}>
              {initials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-white">{user?.username}</p>
              <p className="text-xs text-white/50 capitalize">{user?.roleName}</p>
            </div>
            <button onClick={logout} className="text-white/40 hover:text-red-400">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENT */}
      <main className="flex-1 flex flex-col bg-muted/30">
        <header className="h-20 flex items-center px-4 md:px-8 border-b bg-card/80 justify-between">
          <Button variant="outline" size="icon" className="md:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu className="h-5 w-5" />
          </Button>
        </header>

        <div className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </main>
    </div>
  );
}

/* COMPONENT NAV ITEM (biar bersih & tidak ubah design) */
function NavItem({ item, location, close }: any) {
  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
  return (
    <Link
      href={item.href}
      onClick={close}
      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition ${
        isActive
          ? "bg-gradient-to-r from-primary to-indigo-600 text-white"
          : "text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      <item.icon className="h-5 w-5" />
      {item.name}
    </Link>
  );
}