import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  getGetCustomersQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2, Trash2, User } from "lucide-react";

const emptyForm = {
  name: "",
  address: "",
  phone: "",
};

export default function Pelanggan() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useGetCustomers({
    query: { queryKey: getGetCustomersQueryKey() }
  });

  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const deleteMutation = useDeleteCustomer();

  // ✅ FILTER PELANGGAN
  const filtered = data
    ?.filter((item: any) =>
      item.nama?.toLowerCase().includes(search.toLowerCase())
    ) || [];

  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        name: item.nama || "",
        address: item.alamat || "",
        phone: item.kontak || "",
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          id: editingId,
          data: {
            nama: form.name,
            alamat: form.address,
            kontak: form.phone,
          },
        });
      } else {
        await createMutation.mutateAsync({
          data: {
            nama: form.name,
            alamat: form.address,
            kontak: form.phone,
          },
        });
      }

      queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
      setOpen(false);
    } catch (err: any) {
      console.error("API ERROR:", err);
      alert(err?.message || "Terjadi kesalahan");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetCustomersQueryKey() });
    } catch (err: any) {
      console.error("DELETE ERROR:", err);
      alert(err?.message || "Gagal menghapus");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Pelanggan</h1>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah
        </Button>
      </div>

      <Card>
        <div className="p-4">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4" />
            <Input
              placeholder="Cari pelanggan..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Alamat</TableHead>
                <TableHead>No HP</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4}>Loading...</TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <User className="mx-auto mb-2 opacity-30" />
                    Tidak ada data
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.nama}</TableCell>
                    <TableCell>{item.alamat}</TableCell>
                    <TableCell>{item.kontak}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button size="icon" onClick={() => openForm(item)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit" : "Tambah"} Pelanggan</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Nama</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Alamat</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <div>
              <Label>No HP</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <DialogFooter>
              <Button type="submit">Simpan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}