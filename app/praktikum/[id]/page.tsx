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
  FileDown
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
    <div className="min-h-screen bg-slate-100/60 pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-2 text-xs font-bold text-[#002b66] hover:text-amber-600 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-50"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Kembali ke Daftar Praktikum</span>
            </Link>
          </div>

          <div className="flex items-center space-x-3">
            <img
              src="/uad_logo.png"
              alt="Logo UAD"
              className="w-9 h-9 object-contain drop-shadow-xs"
            />
            <div className="text-right hidden sm:block">
              <span className="text-xs font-extrabold text-[#002b66] uppercase block">Universitas Ahmad Dahlan</span>
              <span className="text-[10px] text-slate-500 font-mono">Modul Laporan Mingguan</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Praktikum Header Info */}
        <div className="paper-card p-6 sm:p-8 mb-8 border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#002b66] border border-blue-200 mb-2.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>Mata Kuliah Praktikum UAD</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002b66] tracking-tight">
                {praktikum.nama}
              </h1>
              <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{praktikum.jadwal}</span>
              </p>
            </div>

            {/* Progress Box */}
            <div className="sm:text-right bg-slate-50 sm:bg-transparent p-4 sm:p-0 rounded-xl border sm:border-0 border-slate-200">
              <span className="text-xs text-slate-500 font-medium">Progres Pelaporan:</span>
              <div className="text-2xl font-black text-[#002b66] mt-0.5">
                {completedCount} <span className="text-sm font-semibold text-slate-400">/ {praktikum.totalMinggu} Selesai</span>
              </div>
              <div className="w-full sm:w-48 bg-slate-200 h-2.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-[#002b66] h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tabel Laporan Mingguan */}
        <div className="paper-card overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Tabel Laporan Mingguan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih minggu untuk mulai menyusun atau merevisi dokumen laporan praktikum
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Minggu</th>
                  <th className="py-3.5 px-6">Topik / Materi</th>
                  <th className="py-3.5 px-6">Status Laporan</th>
                  <th className="py-3.5 px-6 text-center">Dokumen Jadi</th>
                  <th className="py-3.5 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {praktikum.laporan.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50/40 transition-colors group"
                  >
                    {/* Minggu */}
                    <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="w-7 h-7 rounded-lg bg-blue-100 text-[#002b66] text-xs flex items-center justify-center font-bold">
                          {item.mingguKe}
                        </span>
                        <span>Minggu {item.mingguKe}</span>
                      </div>
                    </td>

                    {/* Materi */}
                    <td className="py-4 px-6 text-slate-700">
                      <span className="font-medium">
                        {item.materi || `Modul Praktikum Minggu ${item.mingguKe}`}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      {item.status === "COMPLETED" && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Selesai</span>
                        </span>
                      )}
                      {(item.status === "DRAFT" || item.status === "PROCESSING") && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Draft / Dalam Proses</span>
                        </span>
                      )}
                      {item.status === "NOT_STARTED" && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          <span>Belum Dikerjakan</span>
                        </span>
                      )}
                      {item.status === "FAILED" && (
                        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <span>Gagal Generate</span>
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
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-md text-xs font-semibold inline-flex items-center space-x-1"
                              title="Unduh Word (.docx)"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>DOCX</span>
                            </a>
                          )}
                          {item.pdfPath && (
                            <a
                              href={`/api/download/${item.id}?type=pdf`}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-md text-xs font-semibold inline-flex items-center space-x-1"
                              title="Unduh PDF (.pdf)"
                            >
                              <FileDown className="w-3.5 h-3.5" />
                              <span>PDF</span>
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>

                    {/* Aksi */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <Link
                        href={`/praktikum/${praktikum.id}/laporan/${item.mingguKe}`}
                        className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          item.status === "COMPLETED"
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "btn-primary py-1.5 px-3.5"
                        }`}
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        <span>{item.status === "COMPLETED" ? "Edit / Lihat" : "Buat Laporan"}</span>
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
