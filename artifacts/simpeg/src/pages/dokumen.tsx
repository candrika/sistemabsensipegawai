import { Link } from "wouter";
import { 
  useGetDocumentSummary, 
  getGetDocumentSummaryQueryKey 
} from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, ChevronRight, Folders } from "lucide-react";

export default function Dokumen() {
  const { data: summary, isLoading } = useGetDocumentSummary({
    query: { queryKey: getGetDocumentSummaryQueryKey() }
  });

  const docTypes = [
    { type: "IZIN", label: "Izin", desc: "Surat Izin, Cuti, dan Perjalanan (Otomatis)", color: "stat-card-blue" },
    { type: "DINAS", label: "Dinas", desc: "Surat Keterangan Dinas Luar (Otomatis)", color: "stat-card-green" },
    { type: "SKMJ", label: "SKMJ", desc: "Surat Keterangan Mengikuti Jabatan", color: "stat-card-purple" },
    { type: "SURAT_TUGAS", label: "Surat Tugas", desc: "Pemberian Tugas Khusus", color: "stat-card-red" },
  ];

  return (
    <div className="space-y-8">
      <div className="page-header flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Menu Dokumen</h1>
          <p className="text-muted-foreground mt-2 text-lg">Pilih jenis dokumen untuk melihat dan mengelola arsip surat.</p>
        </div>
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
          <Folders className="h-6 w-6" />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {docTypes.map((doc) => {
          const count = summary ? (summary as any)[doc.type] : 0;

          return (
            <Link key={doc.type} href={`/dokumen/${doc.type}`}>
              <div className={`stat-card ${doc.color} h-full flex flex-col group cursor-pointer`}>
                <div className="flex justify-between items-start mb-6">
                  <div className="h-12 w-12 rounded-xl bg-white/20 text-white flex items-center justify-center backdrop-blur-sm border border-white/20 shadow-inner group-hover:scale-110 transition-transform duration-300">
                    <FileText className="h-6 w-6" />
                  </div>
                  {isLoading ? (
                    <div className="h-7 w-12 bg-white/20 animate-pulse rounded-lg" />
                  ) : (
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold shadow-sm border border-white/10">
                      {count} File
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-extrabold text-2xl text-white">{doc.label}</h3>
                    {(doc.type === "IJIN" || doc.type === "DINAS") && (
                      <span className="bg-green-500/20 text-green-100 text-xs px-2 py-1 rounded-full border border-green-400/30 font-medium">
                        Auto
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-white/80 mt-2 mb-6 font-medium leading-relaxed">
                    {doc.desc}
                  </p>
                </div>
                <div className="mt-auto pt-4 flex items-center justify-between border-t border-white/10">
                  <span className="text-sm font-bold text-white/90">Kelola Dokumen</span>
                  <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-primary transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
                <div className="absolute -right-6 -bottom-6 opacity-[0.05] pointer-events-none group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500">
                  <FileText className="h-40 w-40" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}