import { 
  useGetAttendanceSummary, 
  getGetAttendanceSummaryQueryKey,
  useGetAttendanceRecords,
  getGetAttendanceRecordsQueryKey,
  useGetEmployeeStats,
  getGetEmployeeStatsQueryKey,
  AttendanceRecordStatus
} from "@workspace/api-client-react";
import { type CSSProperties } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserX, Umbrella, Briefcase, UserCheck, CalendarDays } from "lucide-react";
import { format } from "date-fns";

// SVG person silhouette matching the reference image style
function PersonIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 48 56" fill="currentColor" className={className} style={style}>
      <circle cx="24" cy="14" r="11" />
      <path d="M2 52c0-12.15 9.85-22 22-22s22 9.85 22 22" />
    </svg>
  );
}

const EMPLOYEE_STATUS_BEKERJA_CARDS = [
  { key: "aktif",               label: "AKTIF",                accent: "#16a34a", bg: "from-green-500 to-emerald-600",   border: "border-green-400",   text: "text-white",          num: "text-white",          highlight: true },
  { key: "mutasi",              label: "MUTASI",               accent: "#b45309", bg: "from-slate-50 to-amber-50/40",    border: "border-amber-100",   text: "text-amber-700",      num: "text-slate-800", highlight: false },
  { key: "pensiun",             label: "PENSIUN",              accent: "#7c3aed", bg: "from-slate-50 to-violet-50/40",   border: "border-violet-100",  text: "text-violet-700",     num: "text-slate-800", highlight: false },
  { key: "phk",                 label: "PHK",                  accent: "#dc2626", bg: "from-slate-50 to-red-50/40",      border: "border-red-100",    text: "text-red-700",        num: "text-slate-800", highlight: false },
  { key: "mengundurkan_diri",   label: "MENGUNDURKAN DIRI",     accent: "#ea580c", bg: "from-slate-50 to-orange-50/40",   border: "border-orange-100", text: "text-orange-700",     num: "text-slate-800", highlight: false },
] as const;

const EMPLOYEE_STATUS_PEKERJA_CARDS = [
  { key: "total",               label: "DATABASE",             accent: "#2563eb", bg: "from-slate-50 to-blue-50/40",     border: "border-blue-100",   text: "text-blue-700",       num: "text-slate-800", highlight: false },
  { key: "organik",             label: "ORGANIK",              accent: "#7c3aed", bg: "from-slate-50 to-violet-50/40",   border: "border-violet-100", text: "text-violet-700",     num: "text-slate-800", highlight: false },
  { key: "tad",                 label: "TAD",                  accent: "#0891b2", bg: "from-slate-50 to-cyan-50/40",     border: "border-cyan-100",   text: "text-cyan-700",       num: "text-slate-800", highlight: false },
  { key: "tkjp",                label: "MEDICAL",              accent: "#059669", bg: "from-slate-50 to-emerald-50/40",   border: "border-emerald-100",text: "text-emerald-700",    num: "text-slate-800", highlight: false },
  { key: "security",            label: "SECURITY",             accent: "#ea580c", bg: "from-slate-50 to-orange-50/40",   border: "border-orange-100", text: "text-orange-700",      num: "text-slate-800", highlight: false },
  { key: "mitra_kerja",         label: "MITRA KERJA",          accent: "#0d9488", bg: "from-slate-50 to-teal-50/40",     border: "border-teal-100",   text: "text-teal-700",       num: "text-slate-800", highlight: false },
  { key: "driver",              label: "DRIVER",               accent: "#6366f1", bg: "from-slate-50 to-indigo-50/40",   border: "border-indigo-100", text: "text-indigo-700",     num: "text-slate-800", highlight: false },
  { key: "cs",                  label: "CS",                   accent: "#8b5cf6", bg: "from-slate-50 to-fuchsia-50/40",  border: "border-fuchsia-100",text: "text-fuchsia-700",    num: "text-slate-800", highlight: false },
  { key: "gardener",            label: "GARDENER",             accent: "#10b981", bg: "from-slate-50 to-green-50/40",    border: "border-green-100",  text: "text-green-700",      num: "text-slate-800", highlight: false },
] as const;

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetAttendanceSummary({
    query: { queryKey: getGetAttendanceSummaryQueryKey() }
  });

  const { data: empStats, isLoading: isLoadingEmpStats } = useGetEmployeeStats({
    query: { queryKey: getGetEmployeeStatsQueryKey() }
  });

  const today = new Date().toISOString().split('T')[0];
  const { data: records, isLoading: isLoadingRecords } = useGetAttendanceRecords(
    { date: today },
    { query: { queryKey: getGetAttendanceRecordsQueryKey({ date: today }) } }
  );

  const absentCount = Array.isArray(records)
    ? records.filter((r) => r.status === ("absen" as unknown as AttendanceRecordStatus)).length
    : 0;
  const attendanceStats = [
    { title: "Izin", value: summary?.izin || 0, icon: UserCheck, color: "stat-card-blue" },
    { title: "Absen", value: absentCount, icon: UserX, color: "stat-card-red" },
    { title: "Cuti", value: summary?.cuti || 0, icon: Umbrella, color: "stat-card-amber" },
    { title: "Dinas", value: summary?.dinas || 0, icon: Briefcase, color: "stat-card-teal" },
  ];

  const getRecordsByStatus = (status: AttendanceRecordStatus) => {
    if (!Array.isArray(records)) return [];
    return records.filter(r => r.status === status);
  };

  const getStatValue = (key: string): number => {
    if (!empStats) return 0;
    return (empStats as any)[key] ?? 0;
  };

  return (
    <div className="space-y-10">
      <div className="page-header">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Dashboard Utama</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Ringkasan status kepegawaian dan presensi pada {format(new Date(), 'dd MMMM yyyy')}.
        </p>
      </div>

      {/* ── Employee Status Bekerja Cards ────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest mb-5">Status Bekerja</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {EMPLOYEE_STATUS_BEKERJA_CARDS.map((card) => {
            const value = getStatValue(card.key);
            return (
              <div
                key={card.key}
                className={`relative overflow-hidden rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-linear-to-br ${card.bg} ${card.border}`}
              >
                {/* Decorative large background icon */}
                <div className="absolute -right-3 -bottom-3 opacity-[0.08] pointer-events-none">
                  <PersonIcon className="h-20 w-20" style={{ color: card.accent } as any} />
                </div>

                <div className="relative p-4 flex flex-col items-center text-center gap-3">
                  {/* Icon + Number Row */}
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <PersonIcon
                      className={`h-9 w-9 shrink-0 drop-shadow-sm ${card.highlight ? "text-white/90" : ""}`}
                      style={!card.highlight ? { color: card.accent } as any : undefined}
                    />
                    {isLoadingEmpStats ? (
                      <div className={`h-8 w-10 rounded-lg animate-pulse ${card.highlight ? "bg-white/30" : "bg-muted"}`} />
                    ) : (
                      <span className={`text-3xl font-black leading-none tabular-nums ${card.num}`}>
                        {value}
                      </span>
                    )}
                  </div>

                  {/* Label Badge */}
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest leading-none px-3 py-1.5 rounded-full border ${
                      card.highlight
                        ? "bg-white/20 border-white/40 text-white backdrop-blur-sm"
                        : `border-current/30 ${card.text}`
                    }`}
                    style={!card.highlight ? { borderColor: `${card.accent}30` } as any : undefined}
                  >
                    {card.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Employee Status Pekerja Cards ────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest mb-5">Status Pekerja</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {EMPLOYEE_STATUS_PEKERJA_CARDS.map((card) => {
            const value = getStatValue(card.key);
            return (
              <div
                key={card.key}
                className={`relative overflow-hidden rounded-2xl border shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-linear-to-br ${card.bg} ${card.border}`}
              >
                {/* Decorative large background icon */}
                <div className="absolute -right-3 -bottom-3 opacity-[0.08] pointer-events-none">
                  <PersonIcon className="h-20 w-20" style={{ color: card.accent } as any} />
                </div>

                <div className="relative p-4 flex flex-col items-center text-center gap-3">
                  {/* Icon + Number Row */}
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <PersonIcon
                      className={`h-9 w-9 shrink-0 drop-shadow-sm ${card.highlight ? "text-white/90" : ""}`}
                      style={!card.highlight ? { color: card.accent } as any : undefined}
                    />
                    {isLoadingEmpStats ? (
                      <div className={`h-8 w-10 rounded-lg animate-pulse ${card.highlight ? "bg-white/30" : "bg-muted"}`} />
                    ) : (
                      <span className={`text-3xl font-black leading-none tabular-nums ${card.num}`}>
                        {value}
                      </span>
                    )}
                  </div>

                  {/* Label Badge */}
                  <span
                    className={`text-[10px] font-extrabold uppercase tracking-widest leading-none px-3 py-1.5 rounded-full border ${
                      card.highlight
                        ? "bg-white/20 border-white/40 text-white backdrop-blur-sm"
                        : `border-current/30 ${card.text}`
                    }`}
                    style={!card.highlight ? { borderColor: `${card.accent}30` } as any : undefined}
                  >
                    {card.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Attendance Summary Cards ──────────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest mb-5">Presensi Hari Ini</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {attendanceStats.map((stat) => (
            <div key={stat.title} className={`stat-card ${stat.color}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white/80 uppercase tracking-wider">{stat.title}</p>
                  {isLoadingSummary ? (
                    <div className="h-10 w-16 bg-white/20 animate-pulse mt-2 rounded-lg" />
                  ) : (
                    <h3 className="text-4xl font-extrabold mt-1">{stat.value}</h3>
                  )}
                </div>
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
                  <stat.icon className="h-7 w-7 text-white" />
                </div>
              </div>
              <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                <stat.icon className="h-32 w-32" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Attendance Records by Status ──────────────────────────── */}
      <section>
        <h2 className="text-base font-bold text-muted-foreground uppercase tracking-widest mb-5">Rekap Per Kategori</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {Object.values(AttendanceRecordStatus).map((status) => {
            const statusRecords = getRecordsByStatus(status);
            const statusLabels: { [key: string]: string } = {
              izin: "Izin",
              cuti: "Cuti",
              dinas: "Dinas Luar",
              absen: "Absen"
            };
            const title = statusLabels[status] || status.charAt(0).toUpperCase() + status.slice(1);
            
            return (
              <Card key={status} className="flex flex-col border-border/50 shadow-md rounded-2xl overflow-hidden">
                <CardHeader className="bg-muted/40 border-b py-5">
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5 text-primary" />
                      {title}
                    </div>
                    <span className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20 shadow-sm">
                      {statusRecords.length} Pegawai
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1">
                  {isLoadingRecords ? (
                    <div className="p-6 space-y-4">
                      <div className="h-5 bg-muted animate-pulse rounded w-full" />
                      <div className="h-5 bg-muted animate-pulse rounded w-3/4" />
                    </div>
                  ) : statusRecords.length === 0 ? (
                    <div className="p-10 flex flex-col items-center justify-center text-center">
                      <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <UserCheck className="h-6 w-6 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm font-medium text-muted-foreground">Tidak ada record untuk status ini hari ini.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/50">
                      {statusRecords.map((record) => (
                        <li key={record.id} className="p-5 hover:bg-muted/30 transition-colors">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <p className="font-bold text-sm text-foreground">{record.employee?.nama || `Pegawai #${record.employeeId}`}</p>
                              <p className="text-xs text-muted-foreground mt-1 font-medium">{record.employee?.jabatan || '-'}</p>
                            </div>
                            {record.alasan && (
                              <span className="text-xs font-medium bg-secondary text-secondary-foreground px-3 py-1.5 rounded-lg max-w-50 truncate shadow-sm border" title={record.alasan}>
                                {record.alasan}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
