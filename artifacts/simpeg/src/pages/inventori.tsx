import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetInventoryItems, 
  getGetInventoryItemsQueryKey,
  useCreateInventoryItem,
  useUpdateInventoryItem,
  useDeleteInventoryItem,
  useGetInventoryTransactions,
  getGetInventoryTransactionsQueryKey,
  useCreateInventoryTransaction,
  useDeleteInventoryTransaction,
  useGetInventorySummary,
  getGetInventorySummaryQueryKey
} from "@workspace/api-client-react";
import { 
  InventoryItem, 
  InventoryTransactionTipe,
  CreateInventoryItem,
  CreateInventoryTransaction
} from "@workspace/api-client-react/src/generated/api.schemas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Package, ArrowDownToLine, ArrowUpFromLine, Plus, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const itemSchema = z.object({
  kodeBarang: z.string().min(1, "Kode barang diperlukan"),
  namaBarang: z.string().min(1, "Nama barang diperlukan"),
  kategori: z.string().optional(),
  satuan: z.string().optional(),
  stok: z.coerce.number().min(0, "Stok tidak boleh negatif"),
  keterangan: z.string().optional()
});

const transactionSchema = z.object({
  itemId: z.coerce.number().min(1, "Barang diperlukan"),
  tipe: z.enum(["masuk", "keluar"]),
  jumlah: z.coerce.number().min(1, "Jumlah harus lebih dari 0"),
  tanggal: z.string().min(1, "Tanggal diperlukan"),
  penanggungJawab: z.string().optional(),
  keterangan: z.string().optional()
});

export default function Inventori() {
  const [activeTab, setActiveTab] = useState("items");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: summary } = useGetInventorySummary();
  const { data: items = [] } = useGetInventoryItems();
  const { data: transactions = [] } = useGetInventoryTransactions();

  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);

  const createItem = useCreateInventoryItem();
  const updateItem = useUpdateInventoryItem();
  const deleteItem = useDeleteInventoryItem();
  const createTransaction = useCreateInventoryTransaction();
  const deleteTransaction = useDeleteInventoryTransaction();

  const itemForm = useForm<z.infer<typeof itemSchema>>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      kodeBarang: "",
      namaBarang: "",
      kategori: "",
      satuan: "",
      stok: 0,
      keterangan: ""
    }
  });

  const transactionForm = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      itemId: 0,
      tipe: "masuk",
      jumlah: 1,
      tanggal: new Date().toISOString().split('T')[0],
      penanggungJawab: "",
      keterangan: ""
    }
  });

  const onSubmitItem = (data: z.infer<typeof itemSchema>) => {
    if (editingItem) {
      updateItem.mutate({ id: editingItem.id, data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInventoryItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
          setIsItemDialogOpen(false);
          setEditingItem(null);
          toast({ title: "Berhasil", description: "Data barang diperbarui" });
        }
      });
    } else {
      createItem.mutate({ data }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInventoryItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
          setIsItemDialogOpen(false);
          toast({ title: "Berhasil", description: "Barang baru ditambahkan" });
        }
      });
    }
  };

  const onSubmitTransaction = (data: z.infer<typeof transactionSchema>) => {
    createTransaction.mutate({ data: data as CreateInventoryTransaction }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetInventoryTransactionsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventoryItemsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
        setIsTransactionDialogOpen(false);
        toast({ title: "Berhasil", description: "Transaksi dicatat" });
      }
    });
  };

  const handleDeleteItem = (id: number) => {
    if (confirm("Hapus barang ini?")) {
      deleteItem.mutate({ id }, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetInventoryItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
          toast({ title: "Berhasil", description: "Barang dihapus" });
        }
      });
    }
  };

  const openEditItem = (item: InventoryItem) => {
    setEditingItem(item);
    itemForm.reset({
      kodeBarang: item.kodeBarang,
      namaBarang: item.namaBarang,
      kategori: item.kategori || "",
      satuan: item.satuan || "",
      stok: item.stok,
      keterangan: item.keterangan || ""
    });
    setIsItemDialogOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="page-header">
        <h2 className="text-3xl font-extrabold tracking-tight text-foreground">Inventori Barang</h2>
        <p className="text-muted-foreground mt-2 text-lg">Manajemen stok barang masuk dan keluar perusahaan.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="stat-card stat-card-indigo">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Total Jenis Barang</p>
              <div className="text-4xl font-extrabold mt-1">{summary?.totalItems || 0}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <Package className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <Package className="h-32 w-32" />
          </div>
        </div>
        
        <div className="stat-card stat-card-teal">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Total Masuk</p>
              <div className="text-4xl font-extrabold mt-1">{summary?.totalMasuk || 0}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <ArrowDownToLine className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <ArrowDownToLine className="h-32 w-32" />
          </div>
        </div>

        <div className="stat-card stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80 uppercase tracking-wider">Total Keluar</p>
              <div className="text-4xl font-extrabold mt-1">{summary?.totalKeluar || 0}</div>
            </div>
            <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner">
              <ArrowUpFromLine className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
            <ArrowUpFromLine className="h-32 w-32" />
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="items" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Daftar Barang</TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Riwayat Transaksi</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-6 outline-none">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Daftar Barang</h3>
            <Dialog open={isItemDialogOpen} onOpenChange={(open) => {
              setIsItemDialogOpen(open);
              if (!open) {
                setEditingItem(null);
                itemForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="btn-primary-gradient rounded-xl px-5">
                  <Plus className="mr-2 h-5 w-5" />
                  Tambah Barang
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl">{editingItem ? 'Edit Barang' : 'Tambah Barang Baru'}</DialogTitle>
                </DialogHeader>
                <Form {...itemForm}>
                  <form onSubmit={itemForm.handleSubmit(onSubmitItem)} className="space-y-5 pt-4">
                    <FormField
                      control={itemForm.control}
                      name="kodeBarang"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Kode Barang</FormLabel>
                          <FormControl>
                            <Input placeholder="BRG-001" className="bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="namaBarang"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Nama Barang</FormLabel>
                          <FormControl>
                            <Input placeholder="Kertas HVS A4" className="bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-5">
                      <FormField
                        control={itemForm.control}
                        name="kategori"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Kategori</FormLabel>
                            <FormControl>
                              <Input placeholder="ATK" className="bg-muted/30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={itemForm.control}
                        name="satuan"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Satuan</FormLabel>
                            <FormControl>
                              <Input placeholder="Rim" className="bg-muted/30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={itemForm.control}
                      name="stok"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Stok Awal</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" className="bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={itemForm.control}
                      name="keterangan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Keterangan</FormLabel>
                          <FormControl>
                            <Input className="bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="btn-primary-gradient" disabled={createItem.isPending || updateItem.isPending}>
                        Simpan Barang
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
            <Table className="table-premium">
              <TableHeader>
                <TableRow className="table-premium-header">
                  <TableHead className="pl-6">Kode</TableHead>
                  <TableHead>Nama Barang</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Satuan</TableHead>
                  <TableHead className="text-right">Stok</TableHead>
                  <TableHead className="w-[120px] pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center justify-center">
                        <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p>Belum ada data barang.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id} className="table-premium-row">
                      <TableCell className="font-bold pl-6">{item.kodeBarang}</TableCell>
                      <TableCell className="font-medium text-foreground">{item.namaBarang}</TableCell>
                      <TableCell>
                        <span className="bg-secondary text-secondary-foreground px-2.5 py-1 rounded-md text-xs font-semibold">
                          {item.kategori || "-"}
                        </span>
                      </TableCell>
                      <TableCell>{item.satuan || "-"}</TableCell>
                      <TableCell className="text-right font-bold text-base">{item.stok}</TableCell>
                      <TableCell className="pr-6">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="hover:bg-primary/10 hover:text-primary rounded-lg transition-colors" onClick={() => openEditItem(item)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors" onClick={() => handleDeleteItem(item.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-6 outline-none">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold">Riwayat Transaksi</h3>
            <Dialog open={isTransactionDialogOpen} onOpenChange={(open) => {
              setIsTransactionDialogOpen(open);
              if (!open) {
                transactionForm.reset();
              }
            }}>
              <DialogTrigger asChild>
                <Button className="btn-primary-gradient rounded-xl px-5">
                  <Plus className="mr-2 h-5 w-5" />
                  Catat Transaksi
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle className="text-xl">Catat Transaksi Baru</DialogTitle>
                </DialogHeader>
                <Form {...transactionForm}>
                  <form onSubmit={transactionForm.handleSubmit(onSubmitTransaction)} className="space-y-5 pt-4">
                    <FormField
                      control={transactionForm.control}
                      name="itemId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Pilih Barang</FormLabel>
                          <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value ? field.value.toString() : undefined}>
                            <FormControl>
                              <SelectTrigger className="bg-muted/30">
                                <SelectValue placeholder="Pilih barang..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {items.map(item => (
                                <SelectItem key={item.id} value={item.id.toString()}>
                                  {item.kodeBarang} - {item.namaBarang} (Stok: {item.stok})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-5">
                      <FormField
                        control={transactionForm.control}
                        name="tipe"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Tipe Transaksi</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger className="bg-muted/30">
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="masuk">Barang Masuk</SelectItem>
                                <SelectItem value="keluar">Barang Keluar</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transactionForm.control}
                        name="jumlah"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Jumlah</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" className="bg-muted/30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                      <FormField
                        control={transactionForm.control}
                        name="tanggal"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Tanggal</FormLabel>
                            <FormControl>
                              <Input type="date" className="bg-muted/30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={transactionForm.control}
                        name="penanggungJawab"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-semibold">Penanggung Jawab</FormLabel>
                            <FormControl>
                              <Input className="bg-muted/30" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={transactionForm.control}
                      name="keterangan"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-semibold">Keterangan</FormLabel>
                          <FormControl>
                            <Input className="bg-muted/30" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end pt-4">
                      <Button type="submit" className="btn-primary-gradient" disabled={createTransaction.isPending}>
                        Simpan Transaksi
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="rounded-2xl shadow-sm border-border/50 overflow-hidden">
            <Table className="table-premium">
              <TableHeader>
                <TableRow className="table-premium-header">
                  <TableHead className="pl-6">Tanggal</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Barang</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Penanggung Jawab</TableHead>
                  <TableHead>Keterangan</TableHead>
                  <TableHead className="pr-6"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-12">
                      <div className="flex flex-col items-center justify-center">
                        <ArrowDownToLine className="h-10 w-10 text-muted-foreground/30 mb-3" />
                        <p>Belum ada transaksi.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((trx) => (
                    <TableRow key={trx.id} className="table-premium-row">
                      <TableCell className="pl-6 font-medium">{format(new Date(trx.tanggal), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold shadow-sm border ${
                          trx.tipe === 'masuk' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                        }`}>
                          {trx.tipe === 'masuk' ? 'Masuk' : 'Keluar'}
                        </span>
                      </TableCell>
                      <TableCell className="font-bold text-foreground">{trx.item?.namaBarang || `Barang #${trx.itemId}`}</TableCell>
                      <TableCell className="text-right font-extrabold text-base">
                        <span className={trx.tipe === 'masuk' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                          {trx.tipe === 'masuk' ? '+' : '-'}{trx.jumlah}
                        </span>
                      </TableCell>
                      <TableCell>{trx.penanggungJawab || "-"}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">{trx.keterangan || "-"}</TableCell>
                      <TableCell className="text-right pr-6">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                          onClick={() => {
                            if (confirm("Hapus transaksi ini? Stok akan kembali menyesuaikan.")) {
                              deleteTransaction.mutate({ id: trx.id }, {
                                onSuccess: () => {
                                  queryClient.invalidateQueries({ queryKey: getGetInventoryTransactionsQueryKey() });
                                  queryClient.invalidateQueries({ queryKey: getGetInventoryItemsQueryKey() });
                                  queryClient.invalidateQueries({ queryKey: getGetInventorySummaryQueryKey() });
                                }
                              });
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}