import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetSellers,
  useCreateSeller,
  useDeleteSeller,
  useUpdateSeller,
  getGetSellersQueryKey
} from "@workspace/api-client-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Plus, Edit2, Trash2, Store } from "lucide-react";

const emptyForm = {
  nama: "",
  alamat: "",
  kontak: "",
};

export default function Penjual() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [form, setForm] = useState(() => ({ ...emptyForm }));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [open, setOpen] = useState(false);

  // ✅ GET SELLERS
  const { data, isLoading } = useGetSellers();

  // ✅ MUTATIONS
  const createMutation = useCreateSeller();
  const updateMutation = useUpdateSeller();
  const deleteMutation = useDeleteSeller();

  // ✅ FILTER DATA
  const filtered =
    data?.filter((item: any) =>
      item.nama?.toLowerCase().includes(search.toLowerCase())
    ) || [];

  // ✅ OPEN FORM
  const openForm = (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setForm({
        nama: item.nama || "",
        alamat: item.alamat || "",
        kontak: item.kontak || "",
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  // ✅ SAVE DATA
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted, current form state:", form);
    
    // Ensure all values are strings and not undefined
    const nama = String(form.nama ?? "").trim();
    const alamat = String(form.alamat ?? "").trim();
    const kontak = String(form.kontak ?? "").trim();
    
    console.log("Processed values - nama:", nama, "alamat:", alamat, "kontak:", kontak);
    
    // Validate required field
    if (!nama) {
      console.error("❌ Nama is required");
      return;
    }

    const payload = { nama, alamat, kontak };
    console.log("✅ Sending payload:", payload);
    console.log("✅ editingId:", editingId);

    if (editingId) {
      console.log("➡️ Calling updateMutation with:", { id: editingId, data: payload });
      updateMutation.mutate(
        { id: editingId, data: payload },
        {
          onSuccess: () => {
            console.log("✅ Update success");
            queryClient.invalidateQueries({
              queryKey: getGetSellersQueryKey()
            });
            setOpen(false);
            setForm({ nama: "", alamat: "", kontak: "" });
          },
          onError: (err) => console.error("❌ Update error:", err)
        }
      );
    } else {
      console.log("➡️ Calling createMutation with:", { data: payload });
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            console.log("✅ Create success");
            queryClient.invalidateQueries({
              queryKey: getGetSellersQueryKey()
            });
            setOpen(false);
            setForm({ nama: "", alamat: "", kontak: "" });
          },
          onError: (err) => console.error("❌ Create error:", err)
        }
      );
    }
  };

  // ✅ DELETE DATA
  const handleDelete = (id: number) => {
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getGetSellersQueryKey()
          });
        },
        onError: (err) => console.error(err)
      }
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Data Penjual</h1>
        <Button onClick={() => openForm()}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah
        </Button>
      </div>

      {/* CARD */}
      <Card>
        <div className="p-4 flex justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4" />
            <Input
              placeholder="Cari penjual..."
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
                    <Store className="mx-auto mb-2 opacity-30" />
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

      {/* DIALOG */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit" : "Tambah"} Penjual
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <Label>Nama</Label>
              <Input
                value={form.nama ?? ""}
                onChange={(e) =>
                  setForm({ ...form, nama: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label>Alamat</Label>
              <Input
                value={form.alamat ?? ""}
                onChange={(e) =>
                  setForm({ ...form, alamat: e.target.value })
                }
              />
            </div>

            <div>
              <Label>No HP</Label>
              <Input
                value={form.kontak ?? ""}
                onChange={(e) =>
                  setForm({ ...form, kontak: e.target.value })
                }
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