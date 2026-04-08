import { useState } from "react";
import { useRoute, Link } from "wouter";
import { 
  useGetDocuments, 
  getGetDocumentsQueryKey,
  useCreateDocument,
  useDeleteDocument,
  useUpdateDocument,
  useGetEmployees,
  getGetEmployeesQueryKey,
  DocumentType,
  DocumentStatus
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
import { ArrowLeft, Plus, Trash2, FileText, CheckCircle2, Clock, XCircle, Check, X } from "lucide-react";
import { format } from "date-fns";

export default function DokumenList() {
  const [, params] = useRoute("/dokumen/:type");
  const docType = (params?.type || "SP3S") as DocumentType;
  
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: documents, isLoading } = useGetDocuments(
    { type: docType },
    { query: { queryKey: getGetDocumentsQueryKey({ type: docType }) } }
  );

  const { data: employees } = useGetEmployees({
    query: { queryKey: getGetEmployeesQueryKey() }
  });

  const createMutation = useCreateDocument();
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument();

  const [formData, setFormData] = useState({
    employeeId: "",
    nomorSurat: "",
    perihal: "",
    tanggal: new Date().toISOString().split('T')[0],
    status: "pending" as DocumentStatus,
    keterangan: ""
  });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.tanggal) return;

    try {
      await createMutation.mutateAsync({
        data: {
          employeeId: parseInt(formData.employeeId),
          type: docType,
          nomorSurat: formData.nomorSurat || null,
          perihal: formData.perihal || null,
          tanggal: formData.tanggal,
          status: formData.status,
          keterangan: formData.keterangan || null
        }
      });
      toast({ title: "Berhasil", description: "Dokumen ditambahkan" });
      queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey({ type: docType }) });
      queryClient.invalidateQueries({ queryKey: ["/api/documents/summary"] }); // Also update summary
      setIsFormOpen(false);
      setFormData({ ...formData, nomorSurat: "", perihal: "", keterangan: "" });
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" });
    }
  };

  const handleDelete = async (id: number) => {
    if(!confirm("Yakin ingin menghapus dokumen ini?")) return;
    try {
      await deleteMutation.mutateAsync({ id });
      toast({ title: "Berhasil", description: "Dokumen dihapus" });
      queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey({ type: docType }) });
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" });
    }
  };

  const handleUpdateStatus = async (id: number, status: DocumentStatus) => {
    try {
      await updateMutation.mutateAsync({
        id,
        data: { status }
      });
      toast({ title: "Berhasil", description: `Dokumen ${status === 'approved' ? 'disetujui' : status === 'rejected' ? 'ditolak' : 'ditandai pending'}` });
      queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey({ type: docType }) });
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan saat mengubah status", variant: "destructive" });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-orange-500" />;
    }
  };

  const typeLabels: Record<string, string> = {
    IJIN: "Surat Izin, Cuti, dan Perjalanan",
    DINAS: "Surat Keterangan Dinas Luar",
    SKMJ: "Surat Keterangan Mengikuti Jabatan",
    SURAT_TUGAS: "Surat Tugas Khusus"
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/dokumen">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 text-primary p-1.5 rounded">
              <FileText className="h-4 w-4" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Dokumen {docType.replace('_', ' ')}</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">{typeLabels[docType] || ""}</p>
          {(docType === "IJIN" || docType === "DINAS") && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Dokumen ini dibuat otomatis saat input presensi
            </p>
          )}
        </div>
        {(docType === "SKMJ" || docType === "SURAT_TUGAS") && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Buat Surat Baru</span>
            <span className="sm:hidden">Buat</span>
          </Button>
        )}
      </div>

      <Card className="border-none shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>No. Surat / Tanggal</TableHead>
                <TableHead>Pegawai</TableHead>
                <TableHead>Perihal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32">Memuat dokumen...</TableCell>
                </TableRow>
              ) : documents?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                    <div className="flex flex-col items-center justify-center">
                      {(docType === "IJIN" || docType === "DINAS") ? (
                        <>
                          <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                          <p className="text-lg font-medium">Belum ada dokumen {docType}</p>
                          <p className="text-sm mt-1 text-center max-w-md">
                            Dokumen ini akan dibuat otomatis ketika Anda menginput data presensi 
                            {docType === "IJIN" ? " izin/cuti" : " dinas luar"} di menu Presensi.
                          </p>
                        </>
                      ) : (
                        `Belum ada arsip dokumen ${docType}.`
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                documents?.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>
                      <div className="font-mono text-sm font-medium">{doc.nomorSurat || "Draft"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{format(new Date(doc.tanggal), 'dd MMM yyyy')}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{doc.employee?.nama || `ID ${doc.employeeId}`}</div>
                      <div className="text-xs text-muted-foreground">{doc.employee?.jabatan || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm max-w-62.5 truncate" title={doc.perihal || ""}>{doc.perihal || "-"}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm capitalize">
                        {getStatusIcon(doc.status)}
                        <span className={
                          doc.status === 'approved' ? 'text-green-700 dark:text-green-400' :
                          doc.status === 'rejected' ? 'text-red-700 dark:text-red-400' : 'text-orange-700 dark:text-orange-400'
                        }>{doc.status}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {doc.status === 'pending' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
                              onClick={() => handleUpdateStatus(doc.id, 'approved')}
                              disabled={updateMutation.isPending}
                              title="Setujui dokumen"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              onClick={() => handleUpdateStatus(doc.id, 'rejected')}
                              disabled={updateMutation.isPending}
                              title="Tolak dokumen"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(doc.id)}
                          disabled={deleteMutation.isPending}
                          title="Hapus dokumen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Form Dialog - Only show for SKMJ and SURAT_TUGAS */}
      {(docType === "SKMJ" || docType === "SURAT_TUGAS") && (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent className="sm:max-w-125">
            <form onSubmit={handleSave}>
              <DialogHeader>
                <DialogTitle>Buat Dokumen {docType.replace('_', ' ')}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="employee">Pegawai *</Label>
                  <Select value={formData.employeeId} onValueChange={v => setFormData({...formData, employeeId: v})}>
                    <SelectTrigger id="employee">
                      <SelectValue placeholder="Pilih Pegawai" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees?.map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.nama} ({emp.nopek})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomorSurat">Nomor Surat</Label>
                    <Input id="nomorSurat" value={formData.nomorSurat} onChange={e => setFormData({...formData, nomorSurat: e.target.value})} placeholder="Opsional" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tanggal">Tanggal *</Label>
                    <Input type="date" id="tanggal" value={formData.tanggal} onChange={e => setFormData({...formData, tanggal: e.target.value})} required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="perihal">Perihal</Label>
                  <Input id="perihal" value={formData.perihal} onChange={e => setFormData({...formData, perihal: e.target.value})} placeholder="Tujuan/Perihal surat" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={v => setFormData({...formData, status: v as DocumentStatus})}>
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keterangan">Keterangan Tambahan</Label>
                  <Input id="keterangan" value={formData.keterangan} onChange={e => setFormData({...formData, keterangan: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>Batal</Button>
                <Button type="submit" disabled={createMutation.isPending || !formData.employeeId}>
                  Simpan Dokumen
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
