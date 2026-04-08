import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetComplaints,
  getGetComplaintsQueryKey,
  useCreateComplaint,
  useUpdateComplaint,
  useGetComplaintSummary,
  getGetComplaintSummaryQueryKey
} from "@workspace/api-client-react";
import {
  Complaint,
  CreateComplaint,
  ComplaintStatus,
  ComplaintPrioritas,
  ComplaintKategori,
  ComplaintJenisPelanggan
} from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquareWarning, Plus, CheckCircle2, Clock, AlertCircle, XCircle, User, Phone, Mail, Calendar, Tag, FileText, Building2, Fuel } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

// Enhanced validation schema with better precision
const complaintSchema = z.object({
  namaPelanggan: z.string()
    .min(2, "Nama pelanggan minimal 2 karakter")
    .max(100, "Nama pelanggan maksimal 100 karakter")
    .regex(/^[a-zA-Z\s]+$/, "Nama hanya boleh berisi huruf dan spasi"),
  kontakPelanggan: z.string()
    .optional()
    .refine((val) => {
      if (!val) return true; // Optional field
      // Check if it's a valid phone number or email
      const phoneRegex = /^(\+62|62|0)[8-9][0-9]{7,11}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return phoneRegex.test(val) || emailRegex.test(val);
    }, "Kontak harus berupa nomor HP valid atau email"),
  kategori: z.enum(["produk", "layanan", "pengiriman", "lainnya"] as const, {
    required_error: "Kategori keluhan wajib dipilih"
  }),
  jenisPelanggan: z.enum(["perorangan", "SPBU", "industri"] as const, {
    required_error: "Jenis pelanggan wajib dipilih"
  }),
  judul: z.string()
    .min(5, "Judul keluhan minimal 5 karakter")
    .max(200, "Judul keluhan maksimal 200 karakter")
    .regex(/^[a-zA-Z0-9\s.,!?-]+$/, "Judul mengandung karakter yang tidak valid"),
  deskripsi: z.string()
    .min(10, "Deskripsi keluhan minimal 10 karakter")
    .max(1000, "Deskripsi keluhan maksimal 1000 karakter"),
  status: z.enum(["baru", "diproses", "selesai", "ditolak"] as const),
  prioritas: z.enum(["rendah", "sedang", "tinggi"] as const, {
    required_error: "Prioritas keluhan wajib dipilih"
  }),
  tanggal: z.string()
    .min(1, "Tanggal kejadian wajib diisi")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(today.getFullYear() - 1);
      return selectedDate <= today && selectedDate >= oneYearAgo;
    }, "Tanggal harus antara 1 tahun yang lalu sampai hari ini"),
  penangananOleh: z.string().optional(),
  catatanPenanganan: z.string().optional(),
  // Dynamic fields for SPBU and industri customer types
  spbuNumber: z.string().optional(),
  spbuName: z.string().optional(),
  industryName: z.string().optional()
}).refine((data) => {
  // Additional validation for SPBU fields
  if (data.jenisPelanggan === "SPBU") {
    return data.spbuNumber && data.spbuNumber.trim().length > 0;
  }
  return true;
}, {
  message: "Nomor SPBU wajib diisi untuk jenis pelanggan SPBU",
  path: ["spbuNumber"]
}).refine((data) => {
  // Additional validation for industri fields
  if (data.jenisPelanggan === "industri") {
    return data.industryName && data.industryName.trim().length > 0;
  }
  return true;
}, {
  message: "Nama industri wajib diisi untuk jenis pelanggan Industri",
  path: ["industryName"]
});

const updateSchema = z.object({
  status: z.enum(["baru", "diproses", "selesai", "ditolak"] as const),
  penangananOleh: z.string()
    .optional()
    .refine((val) => !val || val.length >= 2, "Nama penanggung jawab minimal 2 karakter"),
  catatanPenanganan: z.string()
    .optional()
    .refine((val) => !val || val.length >= 5, "Catatan penanganan minimal 5 karakter")
});

export default function Keluhan() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "all">("all");
  const [filterPrioritas, setFilterPrioritas] = useState<ComplaintPrioritas | "all">("all");
  const [filterKategori, setFilterKategori] = useState<ComplaintKategori | "all">("all");
  const [filterJenisPelanggan, setFilterJenisPelanggan] = useState<ComplaintJenisPelanggan | "all">("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: summary } = useGetComplaintSummary();
  
  const queryParams: any = {};
  if (filterStatus !== "all") queryParams.status = filterStatus;
  if (filterPrioritas !== "all") queryParams.prioritas = filterPrioritas;
  if (filterKategori !== "all") queryParams.kategori = filterKategori;
  if (filterJenisPelanggan !== "all") queryParams.jenisPelanggan = filterJenisPelanggan;
  
  const { data: complaints = [] } = useGetComplaints(queryParams, {
    query: {
      queryKey: getGetComplaintsQueryKey(queryParams)
    }
  });

  const createComplaint = useCreateComplaint();
  const updateComplaint = useUpdateComplaint();

  const form = useForm<z.infer<typeof complaintSchema>>({
    resolver: zodResolver(complaintSchema),
    defaultValues: {
      namaPelanggan: "",
      kontakPelanggan: "",
      kategori: "layanan",
      jenisPelanggan: "perorangan",
      judul: "",
      deskripsi: "",
      status: "baru",
      prioritas: "sedang",
      tanggal: new Date().toISOString().split('T')[0],
      penangananOleh: "",
      catatanPenanganan: "",
      spbuNumber: "",
      spbuName: "",
      industryName: ""
    }
  });

  const updateForm = useForm<z.infer<typeof updateSchema>>({
    resolver: zodResolver(updateSchema),
    defaultValues: {
      status: "baru",
      penangananOleh: "",
      catatanPenanganan: ""
    }
  });

  const onSubmit = (data: z.infer<typeof complaintSchema>) => {
    createComplaint.mutate({ data: data as CreateComplaint }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetComplaintsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetComplaintSummaryQueryKey() });
        setIsAddDialogOpen(false);
        form.reset();
        toast({ title: "Berhasil", description: "Keluhan baru ditambahkan" });
      }
    });
  };

  const onUpdate = (data: z.infer<typeof updateSchema>) => {
    if (!selectedComplaint) return;
    updateComplaint.mutate({ 
      id: selectedComplaint.id, 
      data: { ...selectedComplaint, ...data } as CreateComplaint
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetComplaintsQueryKey(queryParams) });
        queryClient.invalidateQueries({ queryKey: getGetComplaintSummaryQueryKey() });
        setSelectedComplaint(null);
        toast({ title: "Berhasil", description: "Status keluhan diperbarui" });
      }
    });
  };

  const handleRowClick = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    updateForm.reset({
      status: complaint.status,
      penangananOleh: complaint.penangananOleh || "",
      catatanPenanganan: complaint.catatanPenanganan || ""
    });
  };

  const getPriorityBadge = (p: ComplaintPrioritas) => {
    switch(p) {
      case "tinggi": return <Badge className="bg-rose-500 hover:bg-rose-600 text-white font-bold shadow-sm border-0">Tinggi</Badge>;
      case "sedang": return <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-sm border-0">Sedang</Badge>;
      case "rendah": return <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold shadow-sm border-0">Rendah</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (s: ComplaintStatus) => {
    switch(s) {
      case "baru": return <Badge variant="secondary" className="bg-secondary/80 font-bold border-0">Baru</Badge>;
      case "diproses": return <Badge className="bg-blue-500 hover:bg-blue-600 text-white font-bold shadow-sm border-0">Diproses</Badge>;
      case "selesai": return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm border-0">Selesai</Badge>;
      case "ditolak": return <Badge variant="destructive" className="font-bold border-0 shadow-sm">Ditolak</Badge>;
      default: return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Keluhan Pelanggan</h2>
          <p className="text-muted-foreground mt-2 text-lg">Pencatatan dan pelacakan keluhan dari pelanggan.</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="btn-primary-gradient rounded-xl px-6 h-12 shadow-lg hover:shadow-xl">
              <Plus className="mr-2 h-5 w-5" />
              Tambah Keluhan
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-6">
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <MessageSquareWarning className="h-5 w-5 text-white" />
                </div>
                Catat Keluhan Baru
              </DialogTitle>
              <p className="text-muted-foreground mt-2">Lengkapi informasi keluhan dengan detail yang akurat</p>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Section 1: Informasi Pelanggan */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <User className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Informasi Pelanggan</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="namaPelanggan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Nama Pelanggan *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Masukkan nama lengkap pelanggan" 
                              className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="kontakPelanggan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            Kontak (No. HP / Email)
                          </FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Contoh: 081234567890 atau email@domain.com" 
                              className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="jenisPelanggan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Jenis Pelanggan *
                          </FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/30 h-11 transition-colors focus:bg-background">
                                <SelectValue placeholder="Pilih jenis pelanggan" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="perorangan">Perorangan</SelectItem>
                              <SelectItem value="SPBU">SPBU (Stasiun Pengisian Bahan Bakar)</SelectItem>
                              <SelectItem value="industri">Industri/Korporasi</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Dynamic SPBU Fields */}
                    {form.watch("jenisPelanggan") === "SPBU" && (
                      <>
                        <FormField
                          control={form.control}
                          name="spbuNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-semibold flex items-center gap-2">
                                <Fuel className="h-4 w-4" />
                                Nomor SPBU *
                              </FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Contoh: 34.123.456" 
                                  className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

                    {/* Dynamic Industri Field */}
                    {form.watch("jenisPelanggan") === "industri" && (
                      <FormField
                        control={form.control}
                        name="industryName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Nama Industri *
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Contoh: PT. Industri ABC" 
                                className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* SPBU Name field - shown for both SPBU and when needed */}
                    {form.watch("jenisPelanggan") === "SPBU" && (
                      <FormField
                        control={form.control}
                        name="spbuName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              Nama SPBU
                            </FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Contoh: SPBU Pertamina ABC" 
                                className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* Section 2: Detail Keluhan */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-border/50">
                    <FileText className="h-5 w-5 text-primary" />
                    <h3 className="text-lg font-semibold text-foreground">Detail Keluhan</h3>
                  </div>

                  <FormField
                    control={form.control}
                    name="judul"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2">
                          <Tag className="h-4 w-4" />
                          Judul Keluhan *
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Berikan judul yang singkat dan jelas menggambarkan masalah" 
                            className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deskripsi"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Deskripsi Detail *
                        </FormLabel>
                        <FormControl>
                          <Textarea 
                            rows={5} 
                            className="bg-muted/30 resize-none transition-colors focus:bg-background" 
                            placeholder="Jelaskan secara detail masalah yang dialami pelanggan, kapan terjadi, bagaimana dampaknya, dan informasi relevan lainnya..."
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="kategori"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Kategori *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/30 h-11 transition-colors focus:bg-background">
                                <SelectValue placeholder="Pilih kategori" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="produk">Produk</SelectItem>
                              <SelectItem value="layanan">Layanan</SelectItem>
                              <SelectItem value="pengiriman">Pengiriman</SelectItem>
                              <SelectItem value="lainnya">Lainnya</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="prioritas"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Prioritas *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/30 h-11 transition-colors focus:bg-background">
                                <SelectValue placeholder="Pilih prioritas" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="rendah">Rendah</SelectItem>
                              <SelectItem value="sedang">Sedang</SelectItem>
                              <SelectItem value="tinggi">Tinggi</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tanggal"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Tanggal Kejadian *
                          </FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Status field for admin only */}
                  {isAdmin() && (
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Status Awal</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/30 h-11 transition-colors focus:bg-background">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="baru">Baru</SelectItem>
                              <SelectItem value="diproses">Diproses</SelectItem>
                              <SelectItem value="selesai">Selesai</SelectItem>
                              <SelectItem value="ditolak">Ditolak</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="flex justify-end gap-4 pt-6 border-t border-border/50">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-11 px-6 rounded-xl" 
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button 
                    type="submit" 
                    className="btn-primary-gradient h-11 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200" 
                    disabled={createComplaint.isPending}
                  >
                    {createComplaint.isPending ? "Menyimpan..." : "Simpan Keluhan"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <div className="stat-card stat-card-purple">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Baru</p>
              <div className="text-4xl font-extrabold mt-1">{summary?.baru || 0}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <AlertCircle className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <AlertCircle className="h-32 w-32" />
          </div>
        </div>
        
        <div className="stat-card stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Diproses</p>
              <div className="text-4xl font-extrabold mt-1">{summary?.diproses || 0}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <Clock className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Clock className="h-32 w-32" />
          </div>
        </div>

        <div className="stat-card stat-card-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Selesai</p>
              <div className="text-4xl font-extrabold mt-1">{summary?.selesai || 0}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <CheckCircle2 className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <CheckCircle2 className="h-32 w-32" />
          </div>
        </div>

        <div className="stat-card stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Ditolak</p>
              <div className="text-4xl font-extrabold mt-1">{summary?.ditolak || 0}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <XCircle className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <XCircle className="h-32 w-32" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl shadow-sm border border-border/50">
        <Select value={filterStatus} onValueChange={(v: any) => setFilterStatus(v)}>
          <SelectTrigger className="w-50 border-border/50 bg-muted/20 focus:ring-primary">
            <SelectValue placeholder="Semua Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="baru">Baru</SelectItem>
            <SelectItem value="diproses">Diproses</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
            <SelectItem value="ditolak">Ditolak</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPrioritas} onValueChange={(v: any) => setFilterPrioritas(v)}>
          <SelectTrigger className="w-50 border-border/50 bg-muted/20 focus:ring-primary">
            <SelectValue placeholder="Semua Prioritas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Prioritas</SelectItem>
            <SelectItem value="rendah">Rendah</SelectItem>
            <SelectItem value="sedang">Sedang</SelectItem>
            <SelectItem value="tinggi">Tinggi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterKategori} onValueChange={(v: any) => setFilterKategori(v)}>
          <SelectTrigger className="w-50 border-border/50 bg-muted/20 focus:ring-primary">
            <SelectValue placeholder="Semua Kategori" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kategori</SelectItem>
            <SelectItem value="produk">Produk</SelectItem>
            <SelectItem value="layanan">Layanan</SelectItem>
            <SelectItem value="pengiriman">Pengiriman</SelectItem>
            <SelectItem value="lainnya">Lainnya</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterJenisPelanggan} onValueChange={(v: any) => setFilterJenisPelanggan(v)}>
          <SelectTrigger className="w-50 border-border/50 bg-muted/20 focus:ring-primary">
            <SelectValue placeholder="Semua Jenis Pelanggan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Jenis</SelectItem>
            <SelectItem value="perorangan">Perorangan</SelectItem>
            <SelectItem value="SPBU">SPBU</SelectItem>
            <SelectItem value="industri">Industri</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        <Table className="table-premium">
          <TableHeader>
            <TableRow className="table-premium-header">
              <TableHead className="pl-6">Tanggal</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Prioritas</TableHead>
              <TableHead className="pr-6">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {complaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-16">
                  <div className="flex flex-col items-center justify-center">
                    <MessageSquareWarning className="h-10 w-10 text-muted-foreground/30 mb-3" />
                    <p className="text-lg font-medium">Tidak ada data keluhan</p>
                    <p className="text-sm">Tidak ada keluhan yang sesuai dengan filter Anda.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              complaints.map((complaint) => (
                <TableRow 
                  key={complaint.id} 
                  className="table-premium-row cursor-pointer group"
                  onClick={() => handleRowClick(complaint)}
                >
                  <TableCell className="pl-6 font-medium whitespace-nowrap">{format(new Date(complaint.tanggal), 'dd MMM yyyy')}</TableCell>
                  <TableCell>
                    <div className="font-bold text-foreground group-hover:text-primary transition-colors">{complaint.namaPelanggan}</div>
                    {complaint.kontakPelanggan && (
                      <div className="text-xs text-muted-foreground mt-0.5">{complaint.kontakPelanggan}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="capitalize bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold text-blue-800">
                      {complaint.jenisPelanggan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize bg-secondary px-3 py-1 rounded-full text-xs font-semibold text-secondary-foreground">
                      {complaint.kategori}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-62.5 truncate font-medium" title={complaint.judul}>
                    {complaint.judul}
                  </TableCell>
                  <TableCell>{getPriorityBadge(complaint.prioritas)}</TableCell>
                  <TableCell className="pr-6">{getStatusBadge(complaint.status)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto sm:rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 via-indigo-900 to-purple-950 p-6 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            <div className="relative z-10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <MessageSquareWarning className="h-5 w-5 text-white" />
                  </div>
                  Detail Keluhan
                </DialogTitle>
              </DialogHeader>
            </div>
          </div>
          
          {selectedComplaint && (
            <div className="p-6 space-y-8 bg-card">
              {/* Customer Information Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <div className="flex items-center gap-3 mb-4">
                  <User className="h-5 w-5 text-blue-600" />
                  <h4 className="font-bold text-lg text-blue-900 dark:text-blue-100">Informasi Pelanggan</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-xs">Nama Pelanggan</div>
                    <div className="font-bold text-lg text-foreground">{selectedComplaint.namaPelanggan}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-xs flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      Kontak
                    </div>
                    <div className="font-semibold text-base text-foreground">{selectedComplaint.kontakPelanggan || '-'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-xs flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      Tanggal Kejadian
                    </div>
                    <div className="font-bold text-base text-foreground">{format(new Date(selectedComplaint.tanggal), 'dd MMMM yyyy')}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground font-semibold mb-2 uppercase tracking-wider text-xs">Jenis & Kategori</div>
                    <div className="flex flex-wrap gap-2">
                      <span className="capitalize bg-blue-100 dark:bg-blue-900/30 px-3 py-1 rounded-full text-xs font-semibold text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                        {selectedComplaint.jenisPelanggan}
                      </span>
                      <span className="capitalize bg-secondary px-3 py-1 rounded-full text-xs font-semibold text-secondary-foreground border border-border">
                        {selectedComplaint.kategori}
                      </span>
                      {getPriorityBadge(selectedComplaint.prioritas)}
                      {getStatusBadge(selectedComplaint.status)}
                    </div>
                  </div>
                </div>

                {/* Show SPBU/Industry specific info */}
                {(selectedComplaint.spbuNumber || selectedComplaint.spbuName || selectedComplaint.industryName) && (
                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                    <div className="text-muted-foreground font-semibold mb-2 uppercase tracking-wider text-xs">Detail Tambahan</div>
                    <div className="flex flex-wrap gap-2">
                      {selectedComplaint.spbuNumber && (
                        <span className="bg-orange-100 dark:bg-orange-900/30 px-3 py-1 rounded-full text-xs font-semibold text-orange-800 dark:text-orange-200 border border-orange-200 dark:border-orange-800">
                          SPBU: {selectedComplaint.spbuNumber}
                        </span>
                      )}
                      {selectedComplaint.spbuName && (
                        <span className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full text-xs font-semibold text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800">
                          {selectedComplaint.spbuName}
                        </span>
                      )}
                      {selectedComplaint.industryName && (
                        <span className="bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded-full text-xs font-semibold text-purple-800 dark:text-purple-200 border border-purple-200 dark:border-purple-800">
                          {selectedComplaint.industryName}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Complaint Details Card */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-6 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-5 w-5 text-amber-600" />
                  <h4 className="font-bold text-lg text-amber-900 dark:text-amber-100">Detail Keluhan</h4>
                </div>
                <div className="space-y-4">
                  <div>
                    <h5 className="font-extrabold text-xl mb-3 text-foreground">{selectedComplaint.judul}</h5>
                    <div className="bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
                      <p className="text-base text-foreground whitespace-pre-wrap leading-relaxed">{selectedComplaint.deskripsi}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Update Handling Section */}
              <div className="border-t border-border/50 pt-8">
                <div className="flex items-center gap-3 mb-6">
                  <Clock className="h-5 w-5 text-primary" />
                  <h4 className="font-bold text-xl text-foreground">Update Penanganan</h4>
                </div>
                
                <Form {...updateForm}>
                  <form onSubmit={updateForm.handleSubmit(onUpdate)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={updateForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4" />
                              Update Status
                            </FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!isAdmin()}>
                              <FormControl>
                                <SelectTrigger className="bg-muted/30 h-11 transition-colors focus:bg-background">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="baru">Baru</SelectItem>
                                <SelectItem value="diproses">Diproses</SelectItem>
                                <SelectItem value="selesai">Selesai</SelectItem>
                                <SelectItem value="ditolak">Ditolak</SelectItem>
                              </SelectContent>
                            </Select>
                            {!isAdmin() && <p className="text-xs text-muted-foreground mt-1">Hanya admin yang dapat mengubah status</p>}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={updateForm.control}
                        name="penangananOleh"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold flex items-center gap-2">
                              <User className="h-4 w-4" />
                              Ditangani Oleh
                            </FormLabel>
                            <FormControl>
                              <Input 
                                className="bg-muted/30 h-11 transition-colors focus:bg-background" 
                                placeholder="Nama staf yang menangani"
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={updateForm.control}
                      name="catatanPenanganan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Catatan Penanganan
                          </FormLabel>
                          <FormControl>
                            <Textarea 
                              className="bg-muted/30 resize-none transition-colors focus:bg-background" 
                              rows={4} 
                              placeholder="Jelaskan tindakan yang telah dilakukan, solusi yang diberikan, atau status terbaru penanganan keluhan..."
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end gap-4 pt-6 border-t border-border/50">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="h-11 px-6 rounded-xl" 
                        onClick={() => setSelectedComplaint(null)}
                      >
                        Tutup
                      </Button>
                      <Button 
                        type="submit" 
                        className="btn-primary-gradient h-11 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200" 
                        disabled={updateComplaint.isPending}
                      >
                        {updateComplaint.isPending ? "Menyimpan..." : "Simpan Update"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}