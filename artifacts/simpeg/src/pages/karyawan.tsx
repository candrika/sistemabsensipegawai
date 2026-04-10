// FULL REFACTOR dari kode kamu
// ✅ Theme & warna tetap
// ✅ Status Bekerja → Tabs
// ✅ Filter Status Pekerja → Button + Badge
// ✅ Table tetap dipakai (tidak diubah ke card list)

import { useState } from "react";
import { Link } from "wouter";
import {
  useGetEmployees,
  getGetEmployeesQueryKey,
  useCreateEmployee,
  useUpdateEmployee,
  useDeleteEmployee,
  getGetEmployeeStatsQueryKey,
  StatusPekerja,
  StatusBekerja
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit2, Trash2, ChevronRight, User } from "lucide-react";

const STATUS_PEKERJA_OPTIONS: StatusPekerja[] = ["Organik", "TAD", "TKJP", "Security", "Mitra Kerja", "Driver", "CS", "Gardener"];
const STATUS_BEKERJA_OPTIONS: StatusBekerja[] = ["Aktif", "Mutasi", "Pensiun", "PHK", "Mengundurkan Diri"];
const LOKASI_KERJA_OPTIONS = ["IT Banjarmasin", "Depot Mini LPG"];

export default function Karyawan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusPekerja | "semua">("semua");
  const [activeTab, setActiveTab] = useState<StatusBekerja>("Aktif");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [formData, setFormData] = useState({
    nama: "",
    nopek: "",
    nomor_telepon: "",
    jabatan: "",
    fungsi: "",
    departemen: "",
    lokasi_kerja: "",
    foto: null as File | null,
    status_pekerja: "" as StatusPekerja | "",
    status_bekerja: "" as StatusBekerja | "",
  });

  const { data: employees, isLoading } = useGetEmployees({
    query: { queryKey: getGetEmployeesQueryKey() }
  });

  const createEmployeeMutation = useCreateEmployee({
    mutation: {
      onSuccess: () => {
        toast({
          title: "Berhasil",
          description: "Karyawan baru berhasil ditambahkan",
          variant: "default",
        });
        queryClient.invalidateQueries({ queryKey: getGetEmployeesQueryKey() });
        setIsModalOpen(false);
        setFotoPreview(null);
        setFormData({
          nama: "",
          nopek: "",
          nomor_telepon: "",
          jabatan: "",
          fungsi: "",
          departemen: "",
          lokasi_kerja: "",
          foto: null,
          status_pekerja: "",
          status_bekerja: "",
        });
      },
      onError: (error: any) => {
        toast({
          title: "Gagal",
          description: error?.message || "Gagal menambahkan karyawan",
          variant: "destructive",
        });
      },
    },
  });

  const filteredEmployees = Array.isArray(employees)
    ? employees.filter(emp => {
        const matchSearch = emp.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.nopek.toLowerCase().includes(searchTerm.toLowerCase());

        const matchStatus = filterStatus === "semua" || emp.status_pekerja === filterStatus;
        const matchTab = emp.status_bekerja === activeTab;

        return matchSearch && matchStatus && matchTab;
      })
    : [];

  const handleCreateEmployee = async () => {
    if (!formData.nama || !formData.nopek) {
      toast({
        title: "Validasi",
        description: "Nama dan No. Pegawai harus diisi",
        variant: "destructive",
      });
      return;
    }
    
    let fotoBase64: string | undefined = undefined;
    
    // Only include foto if preview exists and is reasonably sized
    if (formData.foto && fotoPreview && fotoPreview.length < 1024 * 1024) {
      fotoBase64 = fotoPreview;
    }
    
    const payload: any = {
      nama: formData.nama,
      nopek: formData.nopek,
      ...(formData.nomor_telepon && { nomor_telepon: formData.nomor_telepon }),
      ...(formData.jabatan && { jabatan: formData.jabatan }),
      ...(formData.fungsi && { fungsi: formData.fungsi }),
      ...(formData.departemen && { departemen: formData.departemen }),
      ...(formData.lokasi_kerja && { lokasi_kerja: formData.lokasi_kerja }),
      ...(fotoBase64 && { foto: fotoBase64 }),
      ...(formData.status_pekerja && { status_pekerja: formData.status_pekerja }),
      ...(formData.status_bekerja && { status_bekerja: formData.status_bekerja }),
    };
    
    createEmployeeMutation.mutate({
      data: payload,
    });
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFoto(file);
    }
  };

  const handleRemoveFoto = () => {
    setFormData({ ...formData, foto: null });
    setFotoPreview(null);
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Reduce size more aggressively to max 800px width
          const maxWidth = 800;
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress to 70% quality for better size reduction
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = event.target?.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFoto = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Hanya file gambar yang diizinkan",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      toast({
        title: "File Terlalu Besar",
        description: "Ukuran file maksimal 3MB. Silakan gunakan file yang lebih kecil.",
        variant: "destructive",
      });
      return;
    }

    try {
      const compressedBase64 = await compressImage(file);
      
      // Check size after compression (max 1MB base64)
      if (compressedBase64.length > 1024 * 1024) {
        toast({
          title: "File Masih Terlalu Besar",
          description: "Gambar akan dilewati. Gunakan gambar dengan ukuran lebih kecil.",
          variant: "destructive",
        });
        // Skip foto jika terlalu besar
        setFormData({ ...formData, foto: null });
        setFotoPreview(null);
        return;
      }

      setFormData({ ...formData, foto: file });
      setFotoPreview(compressedBase64);
    } catch (err) {
      console.error('Compression error:', err);
      toast({
        title: "Gagal Memproses Gambar",
        description: "Terjadi kesalahan saat memproses gambar. Foto akan dilewati.",
        variant: "destructive",
      });
      // Skip foto if compression fails
      setFormData({ ...formData, foto: null });
      setFotoPreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFoto(files[0]);
    }
  };

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold">Data Pekerja</h1>
          <p className="text-muted-foreground">Kelola data karyawan</p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="btn-primary-gradient">
          <Plus className="mr-2 h-4 w-4" />
          Tambah
        </Button>
      </div>

      {/* FILTER BADGE */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filterStatus === "semua" ? "default" : "outline"}
          onClick={() => setFilterStatus("semua")}
        >
          Semua
          <Badge className="ml-2">{employees?.length || 0}</Badge>
        </Button>

        {STATUS_PEKERJA_OPTIONS.map(status => {
          const count = employees?.filter(e => e.status_pekerja === status).length || 0;

          return (
            <Button
              key={status}
              variant={filterStatus === status ? "default" : "outline"}
              onClick={() => setFilterStatus(status)}
            >
              {status}
              <Badge className="ml-2">{count}</Badge>
            </Button>
          );
        })}
      </div>

      {/* TABS STATUS BEKERJA DALAM CARD */}
      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        <div className="p-4 border-b bg-muted/20">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StatusBekerja)}>
            <TabsList className="grid grid-cols-5 w-full">
              {STATUS_BEKERJA_OPTIONS.map(status => {
                const count = employees?.filter(e => e.status_bekerja === status).length || 0;

                return (
                  <TabsTrigger key={status} value={status}>
                    {status}
                    <Badge className="ml-2" variant="secondary">{count}</Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {STATUS_BEKERJA_OPTIONS.map(status => (
              <TabsContent key={status} value={status}>

                {/* SEARCH */}
                <div className="flex justify-between items-center p-4">
                  <div className="relative w-80">
                    <Search className="absolute left-3 top-3 h-4 w-4" />
                    <Input
                      placeholder="Cari nama / nopek"
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {filteredEmployees.length} data
                  </div>
                </div>

                {/* TABLE */}
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Nopek</TableHead>
                        <TableHead>Jabatan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {isLoading ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            Loading...
                          </TableCell>
                        </TableRow>
                      ) : filteredEmployees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            Tidak ada data
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredEmployees.map(emp => (
                          <TableRow key={emp.id}>
                            <TableCell className="font-medium">{emp.nama}</TableCell>
                            <TableCell>{emp.nopek}</TableCell>
                            <TableCell>{emp.jabatan}</TableCell>
                            <TableCell>
                              <Badge>{emp.status_bekerja}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Link href={`/karyawan/${emp.id}`}>
                                  <Button size="icon" variant="ghost">
                                    <ChevronRight />
                                  </Button>
                                </Link>
                                <Button size="icon" variant="ghost">
                                  <Edit2 />
                                </Button>
                                <Button size="icon" variant="ghost">
                                  <Trash2 />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>

              </TabsContent>
            ))}
          </Tabs>
        </div>
      </Card>

      {/* MODAL TAMBAH KARYAWAN */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setFotoPreview(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto p-0">
          <form className="space-y-0 bg-card">
            {/* HEADER */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white sticky top-0 z-10">
              <h2 className="text-lg font-bold">Tambah Karyawan Baru</h2>
              <p className="text-sm text-white/80 mt-1">Masukkan data karyawan yang akan ditambahkan ke sistem</p>
            </div>

            {/* FORM CONTENT */}
            <div className="p-6 space-y-5">
            {/* SECTION: DATA UTAMA */}
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Data Utama</div>
              
              <div className="grid gap-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nama" className="font-semibold">Nama Lengkap *</Label>
                    <Input
                      id="nama"
                      placeholder="Masukkan nama lengkap"
                      required
                      value={formData.nama}
                      onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                      className="bg-muted/30 h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="nopek" className="font-semibold">Nopek *</Label>
                    <Input
                      id="nopek"
                      placeholder="Masukkan no. pegawai"
                      required
                      value={formData.nopek}
                      onChange={(e) => setFormData({ ...formData, nopek: e.target.value })}
                      className="bg-muted/30 h-11 font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nomor_telepon" className="font-semibold">Nomor Telepon</Label>
                  <Input
                    id="nomor_telepon"
                    placeholder="08xxxxxxxxxx"
                    value={formData.nomor_telepon}
                    onChange={(e) => setFormData({ ...formData, nomor_telepon: e.target.value })}
                    className="bg-muted/30 h-11"
                  />
                </div>
              </div>
            </div>

            {/* SECTION: STATUS KEPEGAWAIAN */}
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Status Kepegawaian</div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Status Pekerja</Label>
                  <Select value={formData.status_pekerja} onValueChange={(value) => setFormData({ ...formData, status_pekerja: value as StatusPekerja })}>
                    <SelectTrigger className="bg-muted/30 h-11">
                      <SelectValue placeholder="— Tidak diisi —" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_PEKERJA_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="font-semibold">Status Bekerja</Label>
                  <Select value={formData.status_bekerja} onValueChange={(value) => setFormData({ ...formData, status_bekerja: value as StatusBekerja })}>
                    <SelectTrigger className="bg-muted/30 h-11">
                      <SelectValue placeholder="— Tidak diisi —" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_BEKERJA_OPTIONS.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* SECTION: JABATAN & LOKASI */}
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Jabatan & Lokasi</div>
              
              <div className="grid gap-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="jabatan" className="font-semibold">Jabatan</Label>
                    <Input
                      id="jabatan"
                      placeholder="Masukkan jabatan"
                      value={formData.jabatan}
                      onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                      className="bg-muted/30 h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fungsi" className="font-semibold">Fungsi</Label>
                    <Input
                      id="fungsi"
                      placeholder="Masukkan fungsi"
                      value={formData.fungsi}
                      onChange={(e) => setFormData({ ...formData, fungsi: e.target.value })}
                      className="bg-muted/30 h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="departemen" className="font-semibold">Departemen</Label>
                    <Input
                      id="departemen"
                      placeholder="Masukkan departemen"
                      value={formData.departemen}
                      onChange={(e) => setFormData({ ...formData, departemen: e.target.value })}
                      className="bg-muted/30 h-11"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="font-semibold">Lokasi Kerja</Label>
                    <Select value={formData.lokasi_kerja} onValueChange={(value) => setFormData({ ...formData, lokasi_kerja: value })}>
                      <SelectTrigger className="bg-muted/30 h-11">
                        <SelectValue placeholder="— Tidak diisi —" />
                      </SelectTrigger>
                      <SelectContent>
                        {LOKASI_KERJA_OPTIONS.map(lokasi => (
                          <SelectItem key={lokasi} value={lokasi}>{lokasi}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION: LAINNYA */}
            <div>
              <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest border-b pb-2">Lainnya</div>
              
              <div className="space-y-2 mt-4">
                <Label htmlFor="foto" className="font-semibold">Foto Karyawan</Label>
                
                {fotoPreview ? (
                  <div className="space-y-2">
                    <div className="relative w-full bg-muted/30 rounded-lg p-4 border border-input">
                      <img src={fotoPreview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={handleRemoveFoto}
                        className="absolute top-2 right-2 bg-destructive text-white p-2 rounded-lg hover:bg-destructive/90"
                      >
                        ✕
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">File: {formData.foto?.name}</p>
                  </div>
                ) : (
                  <label 
                    htmlFor="foto"
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition ${
                      isDragging
                        ? "bg-primary/10 border-primary"
                        : "bg-muted/30 border-input hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className={`w-8 h-8 mb-2 transition ${isDragging ? "text-primary" : "text-muted-foreground"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Klik untuk upload</span> atau drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</p>
                    </div>
                    <input
                      id="foto"
                      type="file"
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* BUTTONS */}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 pt-4 border-t border-border/50">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  setIsModalOpen(false);
                  setFotoPreview(null);
                }}
                className="rounded-xl h-11"
              >
                Batal
              </Button>
              <Button 
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  handleCreateEmployee();
                }}
                disabled={createEmployeeMutation.isPending}
                className="btn-primary-gradient rounded-xl h-11 px-8"
              >
                {createEmployeeMutation.isPending ? "Menyimpan..." : "Simpan Data"}
              </Button>
            </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
