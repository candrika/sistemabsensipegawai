import { useEffect, useState } from "react";
import {
  useGetAttendanceRecords,
  getGetAttendanceRecordsQueryKey,
  useCreateAttendanceRecord,
  useGetEmployees,
  getGetEmployeesQueryKey,
  useCreateDocument,
  getGetDocumentsQueryKey,
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
import { Plus, Filter, CalendarCheck, ClipboardList, UserCheck, CheckCircle2, FileText } from "lucide-react";
import { format } from "date-fns";
import { useDropzone } from "react-dropzone";

const STATUS_CONFIG = {
  izin: { label: "Izin", color: "bg-blue-50 text-blue-700 border-blue-200", dot: "bg-blue-500" },
  cuti: { label: "Cuti", color: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500" },
  dinas: { label: "Dinas Luar", color: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500" },
  absen: { label: "Absen", color: "bg-red-50 text-red-700 border-red-200", dot: "bg-red-500" }
};

export default function Presensi() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [documentPreview, setDocumentPreview] = useState<{ name: string; type: string; url: string } | null>(null);

  const { data: records, isLoading } = useGetAttendanceRecords(
    undefined,
    { query: { queryKey: getGetAttendanceRecordsQueryKey() } }
  );

  const { data: employees } = useGetEmployees({
    query: { queryKey: getGetEmployeesQueryKey() }
  });

  const createMutation = useCreateAttendanceRecord();
  const createDocumentMutation = useCreateDocument();

  const [formData, setFormData] = useState({
    employeeId: "",
    status: "izin" as AttendanceRecordStatus,
    tanggal: new Date().toISOString().split('T')[0],
    tgl_mulai_cuti: "",
    tgl_akhir_cuti: "",
    dokumen_pendukung: "",
    alasan: "",
    keterangan: ""
  });

  const filteredRecords = Array.isArray(records)
    ? records.filter(r => filterStatus === "all" || r.status === filterStatus)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    : [];

  useEffect(() => {
    return () => {
      if (documentPreview?.url) {
        URL.revokeObjectURL(documentPreview.url);
      }
    };
  }, [documentPreview]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employeeId || !formData.status) return;

    try {
      // ✅ FIX: pastikan tidak pernah kirim string kosong
      const tglMulai =
        formData.tgl_mulai_cuti && formData.tgl_mulai_cuti !== ""
          ? formData.tgl_mulai_cuti
          : formData.tanggal;

      const tglAkhir =
        formData.tgl_akhir_cuti && formData.tgl_akhir_cuti !== ""
          ? formData.tgl_akhir_cuti
          : formData.tanggal;

      await createMutation.mutateAsync({
        data: {
          employeeId: parseInt(formData.employeeId),
          status: formData.status,
          tglMulai,
          tglAkhir,
          dokumenPendukung: formData.dokumen_pendukung || null,
          alasan: formData.alasan || null,
          keterangan: formData.keterangan || null,
        },
      });

      toast({
        title: "Berhasil",
        description: "Data presensi berhasil dibuat",
      });

      queryClient.invalidateQueries({
        queryKey: getGetAttendanceRecordsQueryKey(),
      });

      setIsFormOpen(false);

      setFormData({
        employeeId: "",
        status: "izin",
        tanggal: new Date().toISOString().split("T")[0],
        tgl_mulai_cuti: "",
        tgl_akhir_cuti: "",
        dokumen_pendukung: "",
        alasan: "",
        keterangan: "",
      });

      setDocumentPreview(null);

    } catch (err: any) {
      console.error("CREATE ERROR:", err);

      toast({
        title: "Gagal",
        description: err?.response?.data?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
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

  const parseDocumentMeta = (dokumenPendukung:any) => {
    if (!dokumenPendukung) return null;
    console.log("Parsing document meta:", dokumenPendukung);
    
    let json_parse = JSON.parse(dokumenPendukung)
    let string_doc = json_parse.data;
    let name_doc   = json_parse.name;

    const isBase64 = string_doc.startsWith("data:");
    const name = isBase64 ? "Dokumen Pendukung" : name_doc;
    const data = isBase64 ? string_doc : null;

    return { name, data };
  };

  const handlePreviewPdf = (base64Data: string) => {
    const byteCharacters = atob(base64Data.split(",")[1]);
    const byteNumbers = new Array(byteCharacters.length).fill(0).map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    setDocumentPreview({ name: base64Data, type: "application/pdf", url });
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setDocumentPreview({
        name: file.name,
        type: file.type,
        url: URL.createObjectURL(file),
      });
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: "application/pdf,image/*",
  });

  const handleSubmit = async () => {
    if (documentPreview) {
      const formData = new FormData();
      formData.append("file", documentPreview);

      try {
        await createDocumentMutation.mutateAsync(formData);
        toast({ title: "Dokumen berhasil diunggah", status: "success" });
        setDocumentPreview(null);
      } catch (error) {
        toast({ title: "Gagal mengunggah dokumen", status: "error" });
      }
    }
  };

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
            className={`group relative rounded-2xl p-4 text-left border transition-all duration-200 shadow-sm hover:shadow-md ${filterStatus === key
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
            <SelectTrigger className="w-55 bg-background border-border/50 shadow-sm h-11 rounded-xl">
              <SelectValue placeholder="Semua Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Status</SelectItem>
              <SelectItem value="izin">Izin</SelectItem>
              <SelectItem value="cuti">Cuti</SelectItem>
              <SelectItem value="dinas">Dinas Luar</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <CardContent className="p-0">
          <Table className="table-premium">
            <TableHeader>
              <TableRow className="table-premium-header">
                <TableHead className="pl-6 w-40">Tanggal</TableHead>
                <TableHead>Pegawai</TableHead>
                <TableHead className="w-40">Status</TableHead>
                <TableHead className="w-36">Dokumen</TableHead>
                <TableHead className="pr-6">Alasan / Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-48">
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                      <p className="text-muted-foreground font-medium">Memuat data presensi...</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-48 text-muted-foreground">
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
                      {format(new Date(record.createdAt), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-primary font-bold shadow-sm shrink-0">
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
                    <TableCell>
                      {record.dokumenPendukung ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="text-sm font-medium text-primary hover:text-primary/80 underline"
                        >
                          Preview
                          {/* {parseDocumentMeta(record.dokumenPendukung)?.name || record.dokumenPendukung} */}
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
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
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden border-0 shadow-2xl flex flex-col max-h-[90vh]">

          {/* HEADER (tetap) */}
          <div className="bg-linear-to-r from-slate-900 to-indigo-950 p-6 text-white shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
                <UserCheck className="h-5 w-5 text-white" />
              </div>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight text-white">
                  Input Presensi
                </DialogTitle>
              </DialogHeader>
            </div>
            <p className="text-white/60 text-sm mt-2 ml-13">
              Catat kehadiran atau ketidakhadiran pegawai secara manual.
            </p>
          </div>

          {/* FORM */}
          <form onSubmit={handleSave} className="flex flex-col flex-1 bg-card overflow-hidden">

            {/* ISI FORM (jadi scroll) */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Informasi Dasar</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee" className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                      Nama Pegawai *
                    </Label>
                    <Select value={formData.employeeId} onValueChange={v => setFormData({ ...formData, employeeId: v })}>
                      <SelectTrigger id="employee" className="bg-muted/30 h-11 border-border/50 focus:border-primary/50 transition-colors">
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
                  <div className="space-y-2">
                    <Label htmlFor="status" className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                      Status Presensi *
                    </Label>
                    <Select value={formData.status} onValueChange={v => setFormData({ ...formData, status: v as AttendanceRecordStatus })}>
                      <SelectTrigger id="status" className="bg-muted/30 h-11 border-border/50 focus:border-primary/50 transition-colors">
                        <SelectValue placeholder="Pilih Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="izin">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-blue-500" />
                            Izin
                          </div>
                        </SelectItem>
                        <SelectItem value="cuti">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                            Cuti
                          </div>
                        </SelectItem>
                        <SelectItem value="dinas">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            Dinas Luar
                          </div>
                        </SelectItem>
                        <SelectItem value="absen">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            Absen
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Date Range Section - Only show when status is selected */}
              {formData.status && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground">Periode {STATUS_CONFIG[formData.status as keyof typeof STATUS_CONFIG]?.label}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tglMulai" className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                        Tanggal Mulai *
                      </Label>
                      <Input
                        type="date"
                        id="tglMulai"
                        className="bg-muted/30 h-11 border-border/50 focus:border-primary/50 transition-colors"
                        value={formData.tgl_mulai_cuti}
                        onChange={e => setFormData({ ...formData, tgl_mulai_cuti: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tglAkhir" className="font-semibold text-sm text-foreground flex items-center gap-2">
                        <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                        Tanggal Selesai *
                      </Label>
                      <Input
                        type="date"
                        id="tglAkhir"
                        className="bg-muted/30 h-11 border-border/50 focus:border-primary/50 transition-colors"
                        value={formData.tgl_akhir_cuti}
                        onChange={e => setFormData({ ...formData, tgl_akhir_cuti: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Information Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                  <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Informasi Tambahan</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="alasan" className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Alasan
                    </Label>
                    <Input
                      id="alasan"
                      className="bg-muted/30 h-11 border-border/50 focus:border-primary/50 transition-colors"
                      value={formData.alasan}
                      onChange={e => setFormData({ ...formData, alasan: e.target.value })}
                      placeholder="Contoh: Sakit demam, keperluan keluarga, acara penting..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dokumen_pendukung" className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Dokumen Pendukung
                    </Label>
                    <div className="relative">
                      <Input
                        type="file"
                        id="dokumen_pendukung"
                        className="bg-muted/30 h-11 border-border/50 focus:border-primary/50 transition-colors file:bg-primary/10 file:text-primary file:border-0 file:rounded-md file:mr-3 file:px-3 file:py-1 file:text-sm file:font-medium file:hover:bg-primary/20 file:transition-colors"
                        onChange={e => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const url = URL.createObjectURL(file);
                            const reader = new FileReader();
                            reader.onload = () => {
                              setFormData({
                                ...formData,
                                dokumen_pendukung: JSON.stringify({
                                  name: file.name,
                                  type: file.type,
                                  data: reader.result,
                                }),
                              });
                              setDocumentPreview({ name: file.name, type: file.type, url });
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setFormData({ ...formData, dokumen_pendukung: "" });
                            setDocumentPreview(null);
                          }
                        }}
                      />
                      {formData.dokumen_pendukung && (
                        <div className="mt-2 space-y-2">
                          <div className="text-sm text-muted-foreground flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                            {/* File dipilih: {formData.dokumen_pendukung} */}
                          </div>
                          {documentPreview && documentPreview.type.startsWith("image/") && (
                            <img
                              src={documentPreview.url}
                              alt={documentPreview.name}
                              className="max-h-40 w-full rounded-xl border border-border/50 object-contain"
                            />
                          )}
                          {documentPreview && documentPreview.type === "application/pdf" && (
                            <object
                              data={documentPreview.url}
                              type="application/pdf"
                              className="w-full h-64 rounded-xl border border-border/50"
                            >
                              <p className="text-sm text-muted-foreground">Pratinjau PDF tidak tersedia di browser ini.</p>
                            </object>
                          )}
                          {documentPreview && !documentPreview.type.startsWith("image/") && documentPreview.type !== "application/pdf" && (
                            <div className="rounded-xl border border-border/50 bg-muted/50 p-3 text-sm text-muted-foreground">
                              Pratinjau tidak tersedia untuk jenis file ini.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="keterangan" className="font-semibold text-sm text-foreground flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      Keterangan Tambahan
                    </Label>
                    <Input
                      id="keterangan"
                      className="bg-muted/30 h-11 border-border/50 focus:border-primary/50 transition-colors"
                      value={formData.keterangan}
                      onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                      placeholder="Informasi tambahan yang perlu dicatat..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* FOOTER (dibuat sticky) */}
            <DialogFooter className="pt-6 border-t border-border/50 gap-3 bg-background sticky bottom-0 z-10 p-4">
              <Button
                type="button"
                variant="outline"
                className="h-11 px-6 rounded-xl border-border/50 hover:bg-muted/50 transition-colors"
                onClick={() => setIsFormOpen(false)}
              >
                Batal
              </Button>

              <Button
                type="submit"
                className="btn-primary-gradient h-11 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={createMutation.isPending || !formData.employeeId || !formData.status}
              >
                {createMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Menyimpan...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Simpan Presensi
                  </div>
                )}
              </Button>
            </DialogFooter>

          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedRecord)} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden border-0 shadow-2xl flex flex-col max-h-[90vh]">

          {/* HEADER */}
          <div className="bg-gradient-to-r from-slate-950 to-slate-900 p-6 text-white">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">
                    Detail Absensi
                  </DialogTitle>
                </DialogHeader>

                <p className="text-sm text-slate-300">
                  Ringkasan presensi dan dokumen pendukung yang sudah diunggah.
                </p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                {selectedRecord
                  ? STATUS_CONFIG[selectedRecord.status as keyof typeof STATUS_CONFIG]?.label
                  : "Status"}
              </div>

            </div>
          </div>

          {/* BODY */}
          <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-background">

            {selectedRecord ? (
              <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">

                {/* LEFT */}
                <div className="space-y-4">

                  <div className="grid gap-4 sm:grid-cols-2">

                    <div className="rounded-3xl border border-border/70 bg-muted p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Pegawai
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {selectedRecord.employee?.nama || `ID ${selectedRecord.employeeId}`}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-border/70 bg-muted p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        No. Pegawai
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {selectedRecord.employee?.nopek || "-"}
                      </p>
                    </div>

                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">

                    <div className="rounded-3xl border border-border/70 bg-muted p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Periode
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {selectedRecord.tglMulai} — {selectedRecord.tglAkhir}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-border/70 bg-muted p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Tanggal Pengajuan
                      </p>
                      <p className="mt-2 text-base font-semibold text-foreground">
                        {selectedRecord.createdAt
                          ? format(new Date(selectedRecord.createdAt), "dd MMM yyyy")
                          : "-"}
                      </p>
                    </div>

                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">

                    <div className="rounded-3xl border border-border/70 bg-muted p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Alasan
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {selectedRecord.alasan || "—"}
                      </p>
                    </div>

                    <div className="rounded-3xl border border-border/70 bg-muted p-4 shadow-sm">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Keterangan
                      </p>
                      <p className="mt-2 text-sm text-foreground">
                        {selectedRecord.keterangan || "—"}
                      </p>
                    </div>

                  </div>

                </div>

                {/* RIGHT */}
                <div className="rounded-3xl border border-border/70 bg-muted p-4 shadow-sm">

                  <div className="flex items-center gap-3 border-b border-border/70 pb-4 mb-4">

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                        Dokumen Pendukung
                      </p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {parseDocumentMeta(selectedRecord.dokumenPendukung)?.name ||
                          selectedRecord.dokumenPendukung ||
                          "Belum ada file"}
                      </p>
                    </div>

                  </div>

                  {(() => {
                    const documentMeta = parseDocumentMeta(selectedRecord.dokumenPendukung);

                    if (!documentMeta?.data) {
                      return (
                        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-border/50 bg-muted/50 text-center text-sm text-muted-foreground">
                          {selectedRecord.dokumenPendukung
                            ? "Pratinjau tidak tersedia untuk jenis file ini."
                            : "Tidak ada dokumen pendukung."}
                        </div>
                      );
                    }

                    if (documentMeta.data.startsWith("data:image/")) {
                      return (
                        <img
                          src={documentMeta.data}
                          alt={documentMeta.name}
                          className="h-72 w-full rounded-3xl border border-border/50 object-contain"
                        />
                      );
                    }

                    if (documentMeta.data.startsWith("data:application/pdf")) {
                      return (
                        <object
                          data={documentMeta.data}
                          type="application/pdf"
                          className="h-72 w-full rounded-3xl border border-border/50"
                        >
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Pratinjau PDF tidak tersedia.
                          </div>
                        </object>
                      );
                    }

                    return (
                      <div className="flex min-h-64 items-center justify-center rounded-3xl border border-dashed border-border/50 bg-muted/50 text-center text-sm text-muted-foreground">
                        Pratinjau tidak tersedia untuk jenis file ini.
                      </div>
                    );
                  })()}

                </div>

              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Pilih data absensi untuk melihat detail.
              </p>
            )}

          </div>

          {/* FOOTER */}
          <DialogFooter className="border-t border-border/50 p-4">
            <Button type="button" variant="outline" onClick={() => setSelectedRecord(null)}>
              Tutup
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
      
    </div>
  );
}
