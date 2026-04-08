import { useState } from "react";
import {
  useGetRoles,
  useGetPermissions,
  useGetRolePermissions,
  useAssignPermissionToRole,
  useRemovePermissionFromRole,
  getGetRolePermissionsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldOff, Shield, User, Package, MessageSquareWarning, Check, X, ChevronRight, Users, Store } from "lucide-react";

const roleColors: Record<string, string> = {
  admin: "from-violet-600 to-indigo-700",
  pegawai: "from-blue-500 to-cyan-600",
  saler: "from-emerald-500 to-teal-600",
  pelanggan: "from-orange-500 to-amber-600",
};

const roleIcons: Record<string, React.ElementType> = {
  admin: ShieldCheck,
  pegawai: User,
  saler: Package,
  pelanggan: MessageSquareWarning,
};

const resourceColors: Record<string, string> = {
  employees: "bg-blue-100 text-blue-700 border-blue-200",
  attendance: "bg-amber-100 text-amber-700 border-amber-200",
  documents: "bg-violet-100 text-violet-700 border-violet-200",
  inventory: "bg-emerald-100 text-emerald-700 border-emerald-200",
  complaints: "bg-rose-100 text-rose-700 border-rose-200",
  customers: "bg-cyan-100 text-cyan-700 border-cyan-200",
  sellers: "bg-orange-100 text-orange-700 border-orange-200",
  users: "bg-slate-100 text-slate-700 border-slate-200",
};

const actionLabels: Record<string, string> = {
  read: "Baca",
  write: "Tulis",
  delete: "Hapus",
  approve: "Approve",
  read_own: "Baca Milik Sendiri",
};

const resourceLabels: Record<string, string> = {
  employees: "Data Pegawai",
  attendance: "Kehadiran",
  documents: "Dokumen",
  inventory: "Inventori",
  complaints: "Keluhan",
  customers: "Data Pelanggan",
  sellers: "Data Penjual",
  users: "Pengguna",
};

export default function RoleManager() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);

  const [loadingPermId, setLoadingPermId] = useState<number | null>(null);

  const { data: roles, isLoading: rolesLoading } = useGetRoles();
  const { data: allPermissions } = useGetPermissions();
  const { data: rolePermissions, isLoading: permsLoading } = useGetRolePermissions(
    selectedRoleId ?? 0,
    { query: { enabled: selectedRoleId !== null } }
  );

  const assignMutation = useAssignPermissionToRole();
  const removeMutation = useRemovePermissionFromRole();

  const selectedRole = roles?.find(r => r.id === selectedRoleId);
  const assignedPermIds = new Set(rolePermissions?.map(p => p.id) ?? []);

  const permissionsByResource = allPermissions?.reduce((acc, perm) => {
    if (!acc[perm.resource]) acc[perm.resource] = [];
    acc[perm.resource].push(perm);
    return acc;
  }, {} as Record<string, typeof allPermissions[number][]>) ?? {};

  const handleTogglePermission = async (permId: number, isAssigned: boolean) => {
    if (!selectedRoleId) return;

    setLoadingPermId(permId);

    try {
      if (isAssigned) {
        await removeMutation.mutateAsync({
          id: selectedRoleId,
          permissionId: permId,
        });
        toast({ title: "Permission dicabut" });
      } else {
        await assignMutation.mutateAsync({
          id: selectedRoleId,
          permissionId: permId,
        });
        toast({ title: "Permission diberikan" });
      }

      queryClient.invalidateQueries({
        queryKey: getGetRolePermissionsQueryKey(selectedRoleId),
      });
    } catch {
      toast({ title: "Gagal", variant: "destructive" });
    } finally {
      setLoadingPermId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Role & Permission</h1>
          <p className="text-muted-foreground mt-2 text-lg">Kelola hak akses untuk setiap role pengguna.</p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center text-violet-600 shadow-inner">
          <Shield className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="space-y-3">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">Daftar Role</p>
          {rolesLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))
          ) : (
            roles?.map(role => {
              const Icon = roleIcons[role.name] ?? Shield;
              const gradient = roleColors[role.name] ?? "from-slate-600 to-slate-700";
              const isSelected = selectedRoleId === role.id;
              return (
                <button
                  key={role.id}
                  className={`w-full text-left rounded-xl border-2 transition-all duration-200 overflow-hidden ${
                    isSelected ? "border-primary shadow-md shadow-primary/10 scale-[1.01]" : "border-border/50 hover:border-primary/30 hover:shadow-sm"
                  }`}
                  onClick={() => setSelectedRoleId(role.id)}
                >
                  <div className={`bg-gradient-to-r ${gradient} p-4 flex items-center gap-3`}>
                    <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-white capitalize">{role.name}</p>
                      <p className="text-xs text-white/70">{role.description || "–"}</p>
                    </div>
                    {isSelected && <ChevronRight className="h-5 w-5 text-white ml-auto" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          {!selectedRoleId ? (
            <Card className="h-full flex items-center justify-center border-dashed border-2 rounded-2xl">
              <div className="text-center p-8">
                <Shield className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-lg font-semibold text-muted-foreground">Pilih Role</p>
                <p className="text-sm text-muted-foreground mt-1">Klik salah satu role di kiri untuk melihat dan mengelola permission-nya.</p>
              </div>
            </Card>
          ) : (
            <Card className="rounded-2xl border shadow-sm overflow-hidden">
              <CardHeader className="pb-4 border-b bg-muted/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold capitalize flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    Permission untuk Role: <span className="text-primary uppercase">{selectedRole?.name}</span>
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {assignedPermIds.size} aktif dari {allPermissions?.length ?? 0}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[520px]">
                {permsLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  </div>
                ) : (
                  Object.entries(permissionsByResource).map(([resource, perms]) => (
                    <div key={resource} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold uppercase px-2.5 py-1 rounded-md border ${resourceColors[resource] || "bg-slate-100 text-slate-700"}`}>
                          {resourceLabels[resource] || resource}
                        </span>
                        <Separator className="flex-1" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-2">
                        {perms.map(perm => {
                          const isAssigned = assignedPermIds.has(perm.id);
                          const isPending = loadingPermId === perm.id; 
                          // || removeMutation.isPending;
                          return (
                            <button
                              key={perm.id}
                              className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                                isAssigned
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-muted/20 border-border/40 text-muted-foreground hover:bg-muted/40"
                              }`}
                              onClick={() => handleTogglePermission(perm.id, isAssigned)}
                              disabled={isPending}
                            >
                              <div>
                                <p className="text-sm font-semibold">{actionLabels[perm.action] || perm.action}</p>
                                {perm.description && <p className="text-xs opacity-70 mt-0.5">{perm.description}</p>}
                              </div>
                              <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2 ${
                                isAssigned ? "bg-green-600 text-white" : "bg-border"
                              }`}>
                                {isAssigned ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {roles?.map(role => {
          const Icon = roleIcons[role.name] ?? Shield;
          const gradient = roleColors[role.name] ?? "from-slate-600 to-slate-700";
          return (
            <button
              key={role.id}
              className={`rounded-xl bg-gradient-to-br ${gradient} p-4 text-white text-left cursor-pointer hover:opacity-90 transition-opacity`}
              onClick={() => setSelectedRoleId(role.id)}
            >
              <Icon className="h-6 w-6 opacity-80 mb-3" />
              <p className="font-bold capitalize text-sm">{role.name}</p>
              <p className="text-xs text-white/70 mt-0.5 truncate">{role.description || "–"}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
