import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, TrendingUp, BarChart3, Coins } from "lucide-react";
import { format } from "date-fns";

interface BudgetItem {
  id: number;
  kodeAnggaran: string;
  namaAnggaran: string;
  kategori: string;
  tahun: number;
  anggaran: number;
  realisasi: number;
  sisa: number;
  persentase: number;
  keterangan?: string;
  createdAt: string;
}

export default function RealisasiAnggaran() {
  const [activeTab, setActiveTab] = useState("daftar");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [items, setItems] = useState<BudgetItem[]>([
    {
      id: 1,
      kodeAnggaran: "ANG-001",
      namaAnggaran: "Operasional",
      kategori: "Operasional",
      tahun: 2026,
      anggaran: 100000000,
      realisasi: 75000000,
      sisa: 25000000,
      persentase: 75,
      keterangan: "Biaya operasional harian",
      createdAt: new Date().toISOString(),
    },
    {
      id: 2,
      kodeAnggaran: "ANG-002",
      namaAnggaran: "Pemasaran",
      kategori: "Marketing",
      tahun: 2026,
      anggaran: 50000000,
      realisasi: 35000000,
      sisa: 15000000,
      persentase: 70,
      keterangan: "Biaya kampanye pemasaran",
      createdAt: new Date().toISOString(),
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    kodeAnggaran: "",
    namaAnggaran: "",
    kategori: "",
    tahun: new Date().getFullYear(),
    anggaran: 0,
    realisasi: 0,
    keterangan: "",
  });

  const filteredItems = items.filter(item =>
    item.namaAnggaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.kodeAnggaran.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAnggaran = items.reduce((sum, item) => sum + item.anggaran, 0);
  const totalRealisasi = items.reduce((sum, item) => sum + item.realisasi, 0);
  const totalSisa = items.reduce((sum, item) => sum + item.sisa, 0);

  const handleSubmit = () => {
    if (!formData.kodeAnggaran || !formData.namaAnggaran) {
      toast({ title: "Error", description: "Kode dan nama anggaran diperlukan", variant: "destructive" });
      return;
    }

    if (editingItem) {
      setItems(items.map(item =>
        item.id === editingItem.id
          ? {
              ...item,
              ...formData,
              sisa: formData.anggaran - formData.realisasi,
              persentase: formData.anggaran > 0 ? Math.round((formData.realisasi / formData.anggaran) * 100) : 0,
            }
          : item
      ));
      toast({ title: "Berhasil", description: "Data anggaran diperbarui" });
    } else {
      const newItem: BudgetItem = {
        id: Math.max(...items.map(i => i.id), 0) + 1,
        ...formData,
        sisa: formData.anggaran - formData.realisasi,
        persentase: formData.anggaran > 0 ? Math.round((formData.realisasi / formData.anggaran) * 100) : 0,
        createdAt: new Date().toISOString(),
      };
      setItems([...items, newItem]);
      toast({ title: "Berhasil", description: "Anggaran baru ditambahkan" });
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const handleEdit = (item: BudgetItem) => {
    setEditingItem(item);
    setFormData({
      kodeAnggaran: item.kodeAnggaran,
      namaAnggaran: item.namaAnggaran,
      kategori: item.kategori,
      tahun: item.tahun,
      anggaran: item.anggaran,
      realisasi: item.realisasi,
      keterangan: item.keterangan || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (id: number) => {
    if (confirm("Hapus anggaran ini?")) {
      setItems(items.filter(item => item.id !== id));
      toast({ title: "Berhasil", description: "Anggaran dihapus" });
    }
  };

  const resetForm = () => {
    setFormData({
      kodeAnggaran: "",
      namaAnggaran: "",
      kategori: "",
      tahun: new Date().getFullYear(),
      anggaran: 0,
      realisasi: 0,
      keterangan: "",
    });
    setEditingItem(null);
  };

  const getPersentaseColor = (persentase: number) => {
    if (persentase >= 90) return "text-red-600";
    if (persentase >= 75) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Realisasi Anggaran</h2>
        <p className="text-muted-foreground mt-2 text-lg">Pantau realisasi anggaran dan pengeluaran perusahaan.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="stat-card stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Total Anggaran</p>
              <div className="text-3xl font-extrabold mt-1">
                Rp {(totalAnggaran / 1000000).toFixed(0)}M
              </div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <Coins className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Coins className="h-32 w-32" />
          </div>
        </div>

        <div className="stat-card stat-card-amber">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Total Realisasi</p>
              <div className="text-3xl font-extrabold mt-1">
                Rp {(totalRealisasi / 1000000).toFixed(0)}M
              </div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <TrendingUp className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <TrendingUp className="h-32 w-32" />
          </div>
        </div>

        <div className="stat-card stat-card-teal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Sisa Anggaran</p>
              <div className="text-3xl font-extrabold mt-1">
                Rp {(totalSisa / 1000000).toFixed(0)}M
              </div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <BarChart3 className="h-32 w-32" />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="daftar" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Daftar Anggaran
          </TabsTrigger>
          <TabsTrigger value="laporan" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            Laporan Analisis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="daftar" className="space-y-6 outline-none">
          <div className="flex justify-between items-center gap-4">
            <Input
              placeholder="Cari anggaran..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button className="btn-primary-gradient rounded-xl px-5">
                  <Plus className="mr-2 h-5 w-5" />
                  Tambah Anggaran
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-125">
                <DialogHeader>
                  <DialogTitle className="text-xl">
                    {editingItem ? "Edit Anggaran" : "Tambah Anggaran Baru"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="kode" className="font-semibold">Kode Anggaran *</Label>
                    <Input
                      id="kode"
                      placeholder="ANG-001"
                      value={formData.kodeAnggaran}
                      onChange={(e) => setFormData({ ...formData, kodeAnggaran: e.target.value })}
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nama" className="font-semibold">Nama Anggaran *</Label>
                    <Input
                      id="nama"
                      placeholder="Operasional"
                      value={formData.namaAnggaran}
                      onChange={(e) => setFormData({ ...formData, namaAnggaran: e.target.value })}
                      className="bg-muted/30"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="kategori" className="font-semibold">Kategori</Label>
                      <Input
                        id="kategori"
                        placeholder="Operasional"
                        value={formData.kategori}
                        onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                        className="bg-muted/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tahun" className="font-semibold">Tahun</Label>
                      <Input
                        id="tahun"
                        type="number"
                        value={formData.tahun}
                        onChange={(e) => setFormData({ ...formData, tahun: parseInt(e.target.value) })}
                        className="bg-muted/30"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="anggaran" className="font-semibold">Anggaran (Rp)</Label>
                      <Input
                        id="anggaran"
                        type="number"
                        placeholder="100000000"
                        value={formData.anggaran}
                        onChange={(e) => setFormData({ ...formData, anggaran: parseFloat(e.target.value) || 0 })}
                        className="bg-muted/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="realisasi" className="font-semibold">Realisasi (Rp)</Label>
                      <Input
                        id="realisasi"
                        type="number"
                        placeholder="75000000"
                        value={formData.realisasi}
                        onChange={(e) => setFormData({ ...formData, realisasi: parseFloat(e.target.value) || 0 })}
                        className="bg-muted/30"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="keterangan" className="font-semibold">Keterangan</Label>
                    <Input
                      id="keterangan"
                      placeholder="Catatan tambahan"
                      value={formData.keterangan}
                      onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                      className="bg-muted/30"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button onClick={handleSubmit} className="btn-primary-gradient">
                    {editingItem ? "Simpan Perubahan" : "Tambah Anggaran"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="border-border/50 shadow-sm rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              <Table className="table-premium">
                <TableHeader>
                  <TableRow className="table-premium-header">
                    <TableHead className="pl-6 w-32">Kode</TableHead>
                    <TableHead>Nama Anggaran</TableHead>
                    <TableHead className="text-right w-32">Anggaran</TableHead>
                    <TableHead className="text-right w-32">Realisasi</TableHead>
                    <TableHead className="text-right w-28">Sisa</TableHead>
                    <TableHead className="text-right w-24">%</TableHead>
                    <TableHead className="text-right pr-6 w-20">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center h-20 text-muted-foreground">
                        Tidak ada data anggaran
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id} className="table-premium-row">
                        <TableCell className="pl-6 font-mono font-semibold text-sm">{item.kodeAnggaran}</TableCell>
                        <TableCell>
                          <div className="font-medium">{item.namaAnggaran}</div>
                          <div className="text-xs text-muted-foreground">{item.kategori}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          Rp {(item.anggaran / 1000000).toFixed(1)}M
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          Rp {(item.realisasi / 1000000).toFixed(1)}M
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          Rp {(item.sisa / 1000000).toFixed(1)}M
                        </TableCell>
                        <TableCell className={`text-right font-bold ${getPersentaseColor(item.persentase)}`}>
                          {item.persentase}%
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                              className="text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
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
        </TabsContent>

        <TabsContent value="laporan" className="space-y-6 outline-none">
          <Card className="border-border/50 shadow-sm rounded-2xl">
            <CardHeader className="bg-muted/40 border-b">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Analisis Realisasi Anggaran
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {filteredItems.map((item) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{item.namaAnggaran}</p>
                      <p className="text-xs text-muted-foreground">{item.kategori} - {item.tahun}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-sm ${getPersentaseColor(item.persentase)}`}>
                        {item.persentase}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rp {(item.realisasi / 1000000).toFixed(1)}M / Rp {(item.anggaran / 1000000).toFixed(1)}M
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        item.persentase >= 90
                          ? "bg-red-500"
                          : item.persentase >= 75
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(item.persentase, 100)}%` }}
                    />
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-muted-foreground">
                      Sisa: Rp {(item.sisa / 1000000).toFixed(1)}M
                    </span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
