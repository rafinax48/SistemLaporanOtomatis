import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Download,
  PenLine,
  FileDown,
  Layers,
  Sparkles
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PraktikumDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const praktikum = await prisma.praktikum.findUnique({
    where: { id },
    include: {
      laporan: {
        orderBy: { mingguKe: "asc" }
      }
    }
  });

  if (!praktikum) {
    notFound();
  }

  const completedCount = praktikum.laporan.filter((l) => l.status === "COMPLETED").length;
  const progressPercent = Math.round((completedCount / praktikum.totalMinggu) * 100);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Navbar dengan Glassmorphism */}
      <header className="glass-header sticky top-0 z-40 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#002b66] hover:text-amber-600 transition-colors p-2 -ml-2 rounded-xl hover:bg-slate-100/80 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Dashboard</span>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <img
              src="/uad_logo.png"
              alt="Logo UAD"
              className="w-10 h-10 object-contain drop-shadow-xs"
            />
            <div className="text-right hidden sm:block">
              <span className="text-xs font-extrabold text-[#002b66] uppercase block tracking-tight">
                Universitas Ahmad Dahlan
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Modul Pelaporan Praktikum</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Praktikum Header Info */}
        <div className="paper-card p-6 sm:p-8 mb-8 border-slate-200/90 relative overflow-hidden shadow-md shadow-[#002b66]/5">
          {/* Subtle Accent Glow */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-blue-50/60 rounded-full blur-3xl pointer-events-none -z-0" />
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#002b66] border border-blue-200/80 mb-3 shadow-2xs">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Mata Kuliah Praktikum UAD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002b66] tracking-tight leading-tight">
                {praktikum.nama}
              </h1>
              <p className="text-xs text-slate-500 mt-1.5 flex items-center space-x-2 font-medium">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{praktikum.jadwal || "Sesuai Jadwal Laboratorium Informatika"}</span>
              </p>
            </div>

            {/* Progress Box */}
            <div className="sm:text-right bg-slate-50 sm:bg-transparent p-5 sm:p-0 rounded-2xl border sm:border-0 border-slate-200 flex-shrink-0">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Progres Pelaporan</span>
              <div className="text-2xl sm:text-3xl font-black text-[#002b66] mt-1">
                {completedCount}{" "}
                <span className="text-sm font-bold text-slate-400">/ {praktikum.totalMinggu} Selesai</span>
              </div>
              <div className="w-full sm:w-56 bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2.5">
                <div
                  className="bg-gradient-to-r from-amber-400 via-amber-500 to-[#002b66] h-full rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-[11px] font-bold text-amber-600 block mt-1">
                {progressPercent}% capaian semester
              </span>
            </div>
          </div>
        </div>

        {/* Tabel Laporan Mingguan */}
        <div className="paper-card overflow-hidden shadow-sm border-slate-200/90">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-extrabold text-[#002b66] tracking-tight">
                Tabel Modul Laporan Mingguan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-normal">
                Pilih minggu untuk mulai menyusun data pretest, laprak, dan posttest dengan bantuan AI
              </p>
            </div>
            <div className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full w-fit">
              Total {praktikum.totalMinggu} Minggu Percobaan
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 px-6">Minggu</th>
                  <th className="py-4 px-6">Topik / Materi</th>
                  <th className="py-4 px-6">Status Dokumen</th>
                  <th className="py-4 px-6 text-center">Unduh Dokumen</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {praktikum.laporan.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/30 transition-colors group"
                  >
                    {/* Minggu */}
                    <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <span className="w-8 h-8 rounded-xl bg-blue-100/70 text-[#002b66] text-xs flex items-center justify-center font-extrabold group-hover:bg-[#002b66] group-hover:text-amber-300 transition-colors shadow-2xs">
                          {item.mingguKe}
                        </span>
                        <span className="font-bold">Minggu Ke-{item.mingguKe}</span>
                      </div>
                    </td>

                    {/* Materi */}
                    <td className="py-4 px-6 text-slate-700">
                      <span className="font-semibold text-slate-900 group-hover:text-[#002b66] transition-colors block">
                        {item.materi || `Modul Praktikum Minggu ${item.mingguKe}`}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        ID: {item.id.slice(0, 10)}...
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.status === "COMPLETED" && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Selesai</span>
                        </span>
                      )}
                      {(item.status === "DRAFT" || item.status === "PROCESSING") && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                          <span>Draft Tersimpan</span>
                        </span>
                      )}
                      {item.status === "NOT_STARTED" && (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <span>Belum Dikerjakan</span>
                        </span>
                      )}
                      {item.status === "FAILED" && (
                        <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span>Perlu Dibuat Ulang</span>
                        </span>
                      )}
                    </td>

                    {/* Dokumen Jadi */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {item.status === "COMPLETED" ? (
                        <div className="inline-flex items-center space-x-2">
                          {item.docxPath && (
                            <a
                              href={`/api/download/${item.id}?type=docx`}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100/80 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-transform hover:scale-105 shadow-2xs active:scale-95"
                              title="Unduh Word (.docx)"
                            >
                              <FileText className="w-3.5 h-3.5 text-blue-600" />
                              <span>DOCX</span>
                            </a>
                          )}
                          {item.pdfPath && (
                            <a
                              href={`/api/download/${item.id}?type=pdf`}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100/80 text-rose-700 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center space-x-1 transition-transform hover:scale-105 shadow-2xs active:scale-95"
                              title="Unduh PDF (.pdf)"
                            >
                              <FileDown className="w-3.5 h-3.5 text-rose-600" />
                              <span>PDF</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 font-mono">—</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Link
                        href={`/praktikum/${praktikum.id}/laporan/${item.mingguKe}`}
                        className={`inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                          item.status === "COMPLETED"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95"
                            : "btn-primary py-1.5 px-3.5"
                        }`}
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        <span>{item.status === "COMPLETED" ? "Edit / Lihat" : "Susun Laporan"}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
