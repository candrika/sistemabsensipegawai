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
  DocumentStatus,
  // Import GetDocumentsType untuk sinkronisasi filter
  type GetDocumentsType,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Check,
  X,
  Download,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function DokumenList() {
  const [, params] = useRoute("/dokumen/:type");
  // Pastikan casting ke GetDocumentsType agar filter API valid
  const docType = (params?.type?.toUpperCase() || "SP3S") as GetDocumentsType;

  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Fetch data dengan filter tipe
  const { data: documents, isLoading } = useGetDocuments(
    { type: docType },
    { query: { queryKey: getGetDocumentsQueryKey({ type: docType }) } },
  );

  const { data: employees } = useGetEmployees({
    query: { queryKey: getGetEmployeesQueryKey() },
  });

  // Define the type for attendanceRecords explicitly
  interface AttendanceRecord {
    id: number;
    employee: {
      nama: string;
      jabatan: string;
    };
    date: string;
  }

  const attendanceRecords: AttendanceRecord[] = []; // Replace with actual logic or API call

  // Update Document interface to include missing properties
  interface Document {
    id: number;
    type: GetDocumentsType; // Ensure type matches API definition
    nomorSurat?: string;
    tanggal: string;
    employee?: {
      nama?: string;
      jabatan?: string;
    };
    perihal?: string;
    status: DocumentStatus;
    source?: string; // Optional property
    isExpired?: boolean; // Optional property
    filePath?: string; // Optional property
    attendanceId?: number; // Add missing property
  }

  // Adjust type comparison to ensure compatibility with GetDocumentsType
  const filteredDocuments = documents?.filter((doc) => {
    if (["IZIN", "DINAS", "IJIN"].includes(docType)) {
      if (docType === "IZIN" && doc.type === "cuti") {
        return true;
      }
      return doc.type === docType;
    }
    return true;
  }) || [];

  const createMutation = useCreateDocument();
  const deleteMutation = useDeleteDocument();
  const updateMutation = useUpdateDocument();

  const [formData, setFormData] = useState({
    employeeId: "",
    nomorSurat: "",
    perihal: "",
    tanggal: new Date().toISOString().split("T")[0],
    status: "pending" as DocumentStatus,
    keterangan: "",
    filePath: "",
  });

  const uploadFile = async (file: File): Promise<string | null> => {
    const formDataUpload = new FormData();
    formDataUpload.append("file", file);

    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formDataUpload,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Upload failed");
      }

      const result = await response.json();
      return result.filePath;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Gagal mengupload file";
      toast({ title: "Gagal", description: message, variant: "destructive" });
      return null;
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.tanggal) return;

    setIsUploading(true);
    let uploadedFilePath = formData.filePath;

    try {
      if (selectedFile) {
        const filePath = await uploadFile(selectedFile);
        if (!filePath) {
          setIsUploading(false);
          return;
        }
        uploadedFilePath = filePath;
      }

      await createMutation.mutateAsync({
        data: {
          employeeId: parseInt(formData.employeeId),
          type: docType as any,
          nomorSurat: formData.nomorSurat || null,
          perihal: formData.perihal || null,
          tanggal: formData.tanggal,
          status: formData.status,
          keterangan: formData.keterangan || null,
          // Menggunakan spread as any untuk properti yang mungkin belum ada di interface generated
          ...({ filePath: uploadedFilePath || null } as any),
        },
      });

      toast({ title: "Berhasil", description: "Dokumen ditambahkan" });
      queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey({ type: docType }) });
      setIsFormOpen(false);
      setFormData({ ...formData, nomorSurat: "", perihal: "", keterangan: "", filePath: "" });
      setSelectedFile(null);
    } catch (err) {
      toast({ title: "Gagal", description: "Terjadi kesalahan", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin ingin menghapus dokumen ini?")) return;
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
      await updateMutation.mutateAsync({ id, data: { status } });
      toast({ title: "Berhasil", description: `Status diperbarui ke ${status}` });
      queryClient.invalidateQueries({ queryKey: getGetDocumentsQueryKey({ type: docType }) });
    } catch (err) {
      toast({ title: "Gagal", description: "Gagal mengubah status", variant: "destructive" });
    }
  };

  const handleDownload = async (filePath: string, fileName: string) => {
    try {
      const response = await fetch(filePath);
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast({ title: "Gagal", description: "Gagal mengunduh file", variant: "destructive" });
    }
  };

  const typeLabels: Record<string, string> = {
    IZIN: "Surat IZIN, Cuti, dan Perjalanan",
    DINAS: "Surat Keterangan Dinas Luar",
    SKMJ: "Surat Keterangan Mengikuti Jabatan",
    SURAT_TUGAS: "Surat Tugas Khusus",
  };

  // Revert the UI for the "Rekap Kehadiran" menu to its previous version
  const synchronizedDocuments = documents?.map((doc) => {
    if (doc.source === "attendance") {
      const attendance = attendanceRecords?.find((record) => record.id === doc.attendanceId);
      return {
        ...doc,
        employee: attendance?.employee || doc.employee,
        tanggal: attendance?.date || doc.tanggal,
      };
    }
    return doc;
  }) || [];

  const renderTable = (filteredDocuments, isLoading) => (
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
                <TableCell colSpan={5} className="text-center h-32">Memuat...</TableCell>
              </TableRow>
            ) : filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center h-32 text-muted-foreground">
                  Tidak ada dokumen ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => (
                <TableRow key={`${doc.source || "manual"}-${doc.id}`}>
                  <TableCell>
                    <div className="font-mono text-sm font-medium flex items-center gap-2">
                      {doc.nomorSurat || "Draft"}
                      {doc.source === "attendance" && (
                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">AUTO</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(doc.tanggal), "dd MMM yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">{doc.employee?.nama || `ID ${doc.employeeId}`}</div>
                    <div className="text-xs text-muted-foreground">{doc.employee?.jabatan || "-"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm max-w-62.5 truncate" title={doc.perihal || ""}>
                      {doc.perihal || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm capitalize">
                      {doc.isExpired ? (
                        <span className="text-red-500 flex items-center gap-1"><AlertCircle className="h-4 w-4" /> Expired</span>
                      ) : (
                        <span className={doc.status === "approved" ? "text-green-600" : doc.status === "rejected" ? "text-red-600" : "text-orange-600"}>
                          {doc.status}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost" size="icon"
                        className={doc.filePath ? "text-blue-600" : "opacity-20 cursor-not-allowed"}
                        onClick={() => doc.filePath && handleDownload(doc.filePath, doc.nomorSurat || "dokumen")}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {doc.source !== "attendance" && (
                        <>
                          {doc.status === "pending" && (
                            <Button variant="ghost" size="icon" className="text-green-600" onClick={() => handleUpdateStatus(doc.id, "approved")}>
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                         
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(doc.id)}>
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
  );

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
            <h1 className="text-2xl font-bold tracking-tight">
              Dokumen {String(docType).replace("_", " ")}
            </h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {typeLabels[docType as string] || ""}
          </p>
          {(docType === ("IJIN" as any) || docType === "DINAS") && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Dokumen ini dibuat otomatis saat input presensi
            </p>
          )}
        </div>
        {(docType === "SKMJ" || docType === "SURAT_TUGAS") && (
          <Button onClick={() => setIsFormOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span>Buat Surat Baru</span>
          </Button>
        )}
      </div>

      {/* Tabel Dokumen */}
      {renderTable(filteredDocuments, isLoading)}
    </div>
  );
}