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
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Edit2, Trash2, ChevronRight, User } from "lucide-react";

const STATUS_PEKERJA_OPTIONS: StatusPekerja[] = ["Organik", "TAD", "TKJP", "Security", "Mitra Kerja", "Driver", "CS", "Gardener"];
const STATUS_BEKERJA_OPTIONS: StatusBekerja[] = ["Aktif", "Mutasi", "Pensiun", "PHK", "Mengundurkan Diri"];

export default function Karyawan() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusPekerja | "semua">("semua");
  const [activeTab, setActiveTab] = useState<StatusBekerja>("Aktif");

  const { data: employees, isLoading } = useGetEmployees({
    query: { queryKey: getGetEmployeesQueryKey() }
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

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold">Data Pekerja</h1>
          <p className="text-muted-foreground">Kelola data karyawan</p>
        </div>

        <Button className="btn-primary-gradient">
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
    </div>
  );
}
