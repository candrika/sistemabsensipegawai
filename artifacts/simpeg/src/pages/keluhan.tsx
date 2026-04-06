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
  ComplaintKategori
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
import { MessageSquareWarning, Plus, CheckCircle2, Clock, AlertCircle, XCircle } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const complaintSchema = z.object({
  namaPelanggan: z.string().min(1, "Nama diperlukan"),
  kontakPelanggan: z.string().optional(),
  kategori: z.enum(["produk", "layanan", "pengiriman", "lainnya"] as const),
  judul: z.string().min(1, "Judul diperlukan"),
  deskripsi: z.string().min(1, "Deskripsi diperlukan"),
  status: z.enum(["baru", "diproses", "selesai", "ditolak"] as const),
  prioritas: z.enum(["rendah", "sedang", "tinggi"] as const),
  tanggal: z.string().min(1, "Tanggal diperlukan"),
  penangananOleh: z.string().optional(),
  catatanPenanganan: z.string().optional()
});

const updateSchema = z.object({
  status: z.enum(["baru", "diproses", "selesai", "ditolak"] as const),
  penangananOleh: z.string().optional(),
  catatanPenanganan: z.string().optional()
});

export default function Keluhan() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filterStatus, setFilterStatus] = useState<ComplaintStatus | "all">("all");
  const [filterPrioritas, setFilterPrioritas] = useState<ComplaintPrioritas | "all">("all");
  const [filterKategori, setFilterKategori] = useState<ComplaintKategori | "all">("all");

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);

  const { data: summary } = useGetComplaintSummary();
  
  const queryParams: any = {};
  if (filterStatus !== "all") queryParams.status = filterStatus;
  if (filterPrioritas !== "all") queryParams.prioritas = filterPrioritas;
  if (filterKategori !== "all") queryParams.kategori = filterKategori;
  
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
      judul: "",
      deskripsi: "",
      status: "baru",
      prioritas: "sedang",
      tanggal: new Date().toISOString().split('T')[0],
      penangananOleh: "",
      catatanPenanganan: ""
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
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Catat Keluhan Baru</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 pt-4">
                <div className="grid grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="namaPelanggan"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Nama Pelanggan *</FormLabel>
                        <FormControl>
                          <Input className="bg-muted/30" {...field} />
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
                        <FormLabel className="font-semibold">Kontak (No. HP / Email)</FormLabel>
                        <FormControl>
                          <Input className="bg-muted/30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="judul"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Judul Keluhan *</FormLabel>
                      <FormControl>
                        <Input placeholder="Singkat dan jelas..." className="bg-muted/30" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="kategori"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Kategori *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted/30">
                              <SelectValue />
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
                            <SelectTrigger className="bg-muted/30">
                              <SelectValue />
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
                </div>
                <FormField
                  control={form.control}
                  name="deskripsi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold">Deskripsi Detail *</FormLabel>
                      <FormControl>
                        <Textarea rows={4} className="bg-muted/30 resize-none" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-5">
                  <FormField
                    control={form.control}
                    name="tanggal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Tanggal Kejadian *</FormLabel>
                        <FormControl>
                          <Input type="date" className="bg-muted/30" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-semibold">Status Awal</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-muted/30">
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
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" className="btn-primary-gradient px-6" disabled={createComplaint.isPending}>
                    Simpan Keluhan
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
          <SelectTrigger className="w-[200px] border-border/50 bg-muted/20 focus:ring-primary">
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
          <SelectTrigger className="w-[200px] border-border/50 bg-muted/20 focus:ring-primary">
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
          <SelectTrigger className="w-[200px] border-border/50 bg-muted/20 focus:ring-primary">
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
      </div>

      <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
        <Table className="table-premium">
          <TableHeader>
            <TableRow className="table-premium-header">
              <TableHead className="pl-6">Tanggal</TableHead>
              <TableHead>Pelanggan</TableHead>
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
                    <span className="capitalize bg-secondary px-3 py-1 rounded-full text-xs font-semibold text-secondary-foreground">
                      {complaint.kategori}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[250px] truncate font-medium" title={complaint.judul}>
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
        <DialogContent className="max-w-2xl sm:rounded-2xl p-0 overflow-hidden border-0 shadow-2xl">
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight text-white">Detail Keluhan</DialogTitle>
            </DialogHeader>
          </div>
          
          {selectedComplaint && (
            <div className="p-6 space-y-6 bg-card">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm bg-muted/30 p-5 rounded-xl border border-border/50">
                <div>
                  <div className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-xs">Pelanggan</div>
                  <div className="font-bold text-base">{selectedComplaint.namaPelanggan}</div>
                  <div className="text-muted-foreground">{selectedComplaint.kontakPelanggan || '-'}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-xs">Tanggal Kejadian</div>
                  <div className="font-bold text-base">{format(new Date(selectedComplaint.tanggal), 'dd MMMM yyyy')}</div>
                </div>
                
                <div>
                  <div className="text-muted-foreground font-semibold mb-2 uppercase tracking-wider text-xs">Kategori & Prioritas</div>
                  <div className="flex gap-2">
                    <span className="capitalize bg-secondary px-3 py-1 rounded-full text-xs font-semibold">{selectedComplaint.kategori}</span>
                    {getPriorityBadge(selectedComplaint.prioritas)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-extrabold text-xl mb-2 text-foreground">{selectedComplaint.judul}</h4>
                <p className="text-base text-muted-foreground whitespace-pre-wrap leading-relaxed">{selectedComplaint.deskripsi}</p>
              </div>

              <div className="border-t border-border/50 pt-6">
                <h4 className="font-bold text-lg mb-5 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Update Penanganan
                </h4>
                <Form {...updateForm}>
                  <form onSubmit={updateForm.handleSubmit(onUpdate)} className="space-y-5">
                    <div className="grid grid-cols-2 gap-5">
                      <FormField
                        control={updateForm.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Update Status</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-muted/30 h-11">
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
                      <FormField
                        control={updateForm.control}
                        name="penangananOleh"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Ditangani Oleh</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30 h-11" {...field} placeholder="Nama staf..." />
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
                          <FormLabel className="font-semibold">Catatan Penanganan</FormLabel>
                          <FormControl>
                            <Textarea className="bg-muted/30 resize-none" rows={4} {...field} placeholder="Tindakan yang telah dilakukan..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="outline" className="h-11 px-6 rounded-xl" onClick={() => setSelectedComplaint(null)}>
                        Tutup
                      </Button>
                      <Button type="submit" className="btn-primary-gradient h-11 px-8 rounded-xl" disabled={updateComplaint.isPending}>
                        Simpan Update
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