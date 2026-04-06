import { useState } from "react";
import {
  useGetUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useGetRoles,
} from "@workspace/api-client-react";
import { useGetEmployees } from "@workspace/api-client-react";

import { useQueryClient } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function UserManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: users, isLoading } = useGetUsers();
  const { data: roles } = useGetRoles();

  const { data: employees } = useGetEmployees();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<any | null>(null);

  const [form, setForm] = useState({
    username: "",
    password: "",
    roleId: "",
    employeeId: "", // ✅ NEW
  });

  const resetForm = () => {
    setForm({ username: "", password: "", roleId: "", employeeId: "" });
    setEditUser(null);
  };

  const handleSubmit = async () => {
    try {
      if (editUser) {
        await updateUser.mutateAsync({
          id: editUser.id,
          data: {
            username: form.username,
            roleId: Number(form.roleId),
            ...(form.password ? { password: form.password } : {}),
          },
        });
        toast({ title: "User updated" });
      } else {
        await createUser.mutateAsync({
          data: {
            username: form.username,
            password: form.password,
            roleId: Number(form.roleId),
          },
        });
        toast({ title: "User created" });
      }

      queryClient.invalidateQueries({ queryKey: ["getUsers"] });

      setOpen(false);
      resetForm();
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    }
  };

  const handleEdit = (user: any) => {
    setEditUser(user);
    setForm({
      username: user.username,
      password: "",
      roleId: String(user.roleId),
    });
    setOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Hapus user ini?")) return;

    try {
      await deleteUser.mutateAsync({ id });
      toast({ title: "User deleted" });
      queryClient.invalidateQueries({ queryKey: ["getUsers"] });
    } catch {
      toast({ title: "Gagal hapus", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Manager</h1>
        <Button onClick={() => setOpen(true)}>Tambah User</Button>
      </div>

      {/* LIST */}
      <Card>
        <CardHeader>
          <CardTitle>Daftar User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            users?.map((user) => (
              <div
                key={user.id}
                className="flex justify-between items-center p-3 border rounded-lg"
              >
                <div>
                  <p className="font-semibold">{user.username}</p>
                  <p className="text-sm text-muted-foreground">
                    Role: {user.roleName || "-"}
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleEdit(user)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleDelete(user.id)}>
                    Hapus
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* MODAL */}
      <Dialog open={open} onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetForm();
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editUser ? "Edit User" : "Tambah User"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="Username"
              value={form.username}
              onChange={(e) =>
                setForm({ ...form, username: e.target.value })
              }
            />

            <Input
              placeholder={editUser ? "Password (opsional)" : "Password"}
              type="password"
              value={form.password}
              onChange={(e) =>
                setForm({ ...form, password: e.target.value })
              }
            />

            <Select
              value={form.roleId}
              onValueChange={(v) => setForm({ ...form, roleId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Role" />
              </SelectTrigger>
              <SelectContent>
                {roles?.map((role) => (
                  <SelectItem key={role.id} value={String(role.id)}>
                    {role.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select
              value={form.employeeId}
              onValueChange={(v) => setForm({ ...form, employeeId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Pilih Pegawai" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((emp) => (
                  <SelectItem key={emp.id} value={String(emp.id)}>
                    {emp.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={
                !form.username ||
                (!editUser && !form.password) ||
                !form.roleId
              }
            >
              {editUser ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}