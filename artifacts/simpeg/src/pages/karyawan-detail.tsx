import { useRoute } from "wouter";
import { 
  useGetEmployee, 
  getGetEmployeeQueryKey,
  useGetAttendanceRecords,
  getGetAttendanceRecordsQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, User, Calendar, Briefcase, Hash } from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";

export default function KaryawanDetail() {
  const [, params] = useRoute("/karyawan/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: employee, isLoading: isLoadingEmp } = useGetEmployee(id, {
    query: { enabled: !!id, queryKey: getGetEmployeeQueryKey(id) }
  });

  const { data: attendance, isLoading: isLoadingAtt } = useGetAttendanceRecords(
    undefined, 
    { query: { queryKey: getGetAttendanceRecordsQueryKey() } }
  );

  const employeeAttendance = Array.isArray(attendance) ? attendance.filter(r => r.employeeId === id) : [];
  
  if (isLoadingEmp) {
    return <div className="p-8 text-center">Memuat data pegawai...</div>;
  }

  if (!employee) {
    return <div className="p-8 text-center text-destructive">Pegawai tidak ditemukan.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/karyawan">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profil Pegawai</h1>
          <p className="text-muted-foreground mt-1">Detail informasi dan riwayat kehadiran</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-none shadow-sm h-fit">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-32 w-32 rounded-full border-4 border-background shadow-lg overflow-hidden bg-muted flex items-center justify-center">
                {employee.foto ? (
                  <img src={employee.foto} alt={employee.nama} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-muted-foreground" />
                )}
              </div>
              <div>
                <h2 className="text-xl font-bold">{employee.nama}</h2>
                <div className="inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                  {employee.jabatan || 'Belum ada jabatan'}
                </div>
              </div>
            </div>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  <Hash className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">NOPEK</p>
                  <p className="font-mono">{employee.nopek}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">DEPARTEMEN</p>
                  <p>{employee.departemen || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">BERGABUNG</p>
                  <p>{format(new Date(employee.createdAt), 'dd MMM yyyy')}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle>Riwayat Kehadiran (Non-Hadir)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAtt ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Memuat riwayat...</div>
            ) : employeeAttendance.length === 0 ? (
              <div className="py-12 flex flex-col items-center text-center bg-muted/20 rounded-lg border border-dashed">
                <Calendar className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground">Belum ada riwayat cuti, izin, dinas, atau tidak hadir.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {employeeAttendance.sort((a,b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).map(record => (
                  <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 w-2 h-2 rounded-full ${
                        record.status === 'izin' ? 'bg-blue-500' :
                        record.status === 'cuti' ? 'bg-orange-500' :
                        record.status === 'dinas' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <div>
                        <p className="font-semibold text-sm">
                          {format(new Date(record.tanggal), 'dd MMMM yyyy')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          <span className="font-medium text-foreground capitalize mr-2">{record.status.replace('_', ' ')}</span>
                          {record.alasan ? `— ${record.alasan}` : ''}
                        </p>
                      </div>
                    </div>
                    {record.keterangan && (
                      <div className="text-xs text-muted-foreground bg-muted px-3 py-2 rounded-md sm:max-w-[200px] w-full">
                        {record.keterangan}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
