import { useState } from "react";
import { 
  useGetAttendanceRecords, 
  getGetAttendanceRecordsQueryKey,
  useCreateAttendanceRecord,
  useGetEmployees,
  getGetEmployeesQueryKey,
  AttendanceRecordStatus
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Filter, CalendarCheck, ClipboardList, UserCheck } from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG = {
  izin:       { label: "Izin",        color: "bg-blue-50 text-blue-700 border-blue-200",   dot: "bg-blue-500" },
  cuti:       { label: "Cuti",        color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  dinas:      { label: "Dinas Luar",  color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  tidak_hadir:{ label: "Tidak Hadir", color: "bg-rose-50 text-rose-700 border-rose-200",   dot: "bg-rose-500" },
};

export default function Presensi() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: records, isLoading } = useGetAttendanceRecords(
    undefined,
    { query: { queryKey: getGetAttendanceRecordsQueryKey() } }
  );

  const { data: employees } = useGetEmployees({
    query: { queryKey: getGetEmployeesQueryKey() }
  });

  const createMutation = useCreateAttendanceRecord();

  const [formData, setFormData] = useState({
    employeeId: "",
    status: "" as AttendanceRecordStatus,
    tanggal: new Date().toISOString().split('T')[0],
    alasan: "",
    keterangan: ""
  });

  const filteredRecords = Array.isArray(records)
    ? records.filter(r => filterStatus === "all" || r.status === filterStatus)
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    : [];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.status || !formData.tanggal) return;

    try {
      await createMutation.mutateAsync({
        data: {
          employeeId: parseInt(formData.employeeId),
          status: formData.status,
          tanggal: formData.tanggal,
          alasan: formData.alasan || null,
          keterangan: formData.keterangan || null
        }
      });
      toast({ title: "Berhasil", description: "Data presensi berhasil disimpan" });
      queryClient.invalidateQueries({ queryKey: getGetAttendanceRecordsQueryKey() });
      setIsFormOpen(false);
      setFormData({ ...formData, employeeId: "", alasan: "", keterangan: "", status: "" as AttendanceRecordStatus });
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan saat menyimpan", variant: "destructive" });
    }
  };

  const getStatusBadge = (status: string) => {
    const cfg = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!cfg) return null;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow-sm border ${cfg.color}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
        {cfg.label}
      </span>
    );
  };

  const statusCounts = Array.isArray(records)
    ? Object.keys(STATUS_CONFIG).reduce((acc, s) => {
        acc[s] = records.filter(r => r.status === s).length;
        return acc;
      }, {} as Record<string, number>)
    : {};

  return (
    <div className="space-y-8">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Presensi Pegawai</h1>
          <p className="text-muted-foreground mt-2 text-lg">Input manual izin, cuti, dinas luar, dan ketidakhadiran pegawai.</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="btn-primary-gradient rounded-xl px-6 h-12 shadow-lg hover:shadow-xl">
          <Plus className="h-5 w-5 mr-2" />
          Input Presensi
        </Button>
      </div>

      {/* Summary Mini Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            className={`group relative rounded-2xl p-4 text-left border transition-all duration-200 shadow-sm hover:shadow-md ${
              filterStatus === key
                ? "ring-2 ring-primary bg-primary text-primary-foreground border-primary scale-[1.02]"
                : "bg-card border-border hover:border-primary/40"
            }`}
          >
            <div className={`text-3xl font-extrabold ${filterStatus === key ? "text-white" : "text-foreground"}`}>
              {statusCounts[key] ?? 0}
            </div>
            <div className={`flex items-center gap-1.5 mt-1 text-sm font-semibold ${filterStatus === key ? "text-white/80" : "text-muted-foreground"}`}>
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
            {filterStatus === key && (
              <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-white/80 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        <div className="p-5 bg-muted/20 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Filter className="h-5 w-5" />
            </div>
            <span className="font-semibold text-foreground">
              {filterStatus === "all" ? "Semua Presensi" : `Filter: ${STATUS_CONFIG[filterStatus as keyof typeof STATUS_CONFIG]?.label}`}
            </span>
            <span className="text-xs text-muted-foreground font-medium bg-muted rounded-full px-2.5 py-1">
              {filteredRecords.length} record
            </span>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[220px] bg-background border-border/50 shadow-sm h-11 rounded-xl">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="izin">Izin</SelectItem>
              <SelectItem value="cuti">Cuti</SelectItem>
              <SelectItem value="dinas">Dinas Luar</SelectItem>
              <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          <Table className="table-premium">
            <TableHeader>
              <TableRow className="table-premium-header">
                <TableHead className="pl-6 w-[160px]">Tanggal</TableHead>
                <TableHead>Pegawai</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                <TableHead className="pr-6">Alasan / Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-48">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                      <p className="text-muted-foreground font-medium">Memuat data presensi...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-48 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      <ClipboardList className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <p className="text-lg font-medium">Belum ada data presensi.</p>
                      <p className="text-sm mt-1">Klik "Input Presensi" untuk menambahkan data baru.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.map((record) => (
                  <TableRow key={record.id} className="table-premium-row">
                    <TableCell className="pl-6 font-bold whitespace-nowrap text-sm">
                      {format(new Date(record.tanggal), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-primary font-bold shadow-sm flex-shrink-0">
                          {record.employee?.nama?.charAt(0) || "P"}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{record.employee?.nama || `ID ${record.employeeId}`}</span>
                          {record.employee?.nopek && (
                            <span className="font-mono text-xs text-muted-foreground px-1.5 py-0.5 bg-muted/50 rounded inline-block mt-0.5 w-fit border border-border/50">{record.employee.nopek}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(record.status)}</TableCell>
                    <TableCell className="pr-6">
                      {record.alasan && <div className="font-medium text-sm">{record.alasan}</div>}
                      {record.keterangan && (
                        <div className="text-sm text-muted-foreground mt-0.5">{record.keterangan}</div>
                      )}
                      {!record.alasan && !record.keterangan && <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Input Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[520px] p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight text-white">Input Presensi</DialogTitle>
              </DialogHeader>
            </div>
            <p className="text-white/60 text-sm mt-2 ml-13">Catat kehadiran atau ketidakhadiran pegawai secara manual.</p>
          </div>
          <form onSubmit={handleSave} className="p-6 space-y-5 bg-card">
            <div className="space-y-2">
              <Label htmlFor="employee" className="font-semibold">Nama Pegawai *</Label>
              <Select value={formData.employeeId} onValueChange={v => setFormData({...formData, employeeId: v})}>
                <SelectTrigger id="employee" className="bg-muted/30 h-11">
                  <SelectValue placeholder="Pilih Pegawai" />
                </SelectTrigger>
                <SelectContent>
                  {Array.isArray(employees) && employees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.nama} — {emp.nopek}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="font-semibold">Status Presensi *</Label>
                <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as AttendanceRecordStatus})}>
                  <SelectTrigger id="status" className="bg-muted/30 h-11">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="izin">Izin</SelectItem>
                    <SelectItem value="cuti">Cuti</SelectItem>
                    <SelectItem value="dinas">Dinas Luar</SelectItem>
                    <SelectItem value="tidak_hadir">Tidak Hadir</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tanggal" className="font-semibold">Tanggal *</Label>
                <Input type="date" id="tanggal" className="bg-muted/30 h-11" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="alasan" className="font-semibold">Alasan</Label>
              <Input id="alasan" className="bg-muted/30 h-11" value={formData.alasan} onChange={e => setFormData({...formData, alasan: e.target.value})} placeholder="Contoh: Sakit demam, keperluan keluarga..." />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keterangan" className="font-semibold">Keterangan Tambahan</Label>
              <Input id="keterangan" className="bg-muted/30 h-11" value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} placeholder="Opsional..." />
            </div>
            <DialogFooter className="pt-4 border-t border-border/50">
              <Button type="button" variant="outline" className="h-11 px-6 rounded-xl" onClick={() => setIsFormOpen(false)}>Batal</Button>
              <Button type="submit" className="btn-primary-gradient h-11 px-8 rounded-xl" disabled={createMutation.isPending || !formData.employeeId || !formData.status}>
                {createMutation.isPending ? "Menyimpan..." : "Simpan Presensi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
