"use client";

import { useState } from "react";
import { GraduationCap, BookOpen, Clock, ArrowRight, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";

export function OnboardingView({ onComplete }: { onComplete: () => void }) {
  // Identitas Mahasiswa
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [kelas, setKelas] = useState("");

  // Setup Praktikum Pertama (Minimal 1)
  const [namaPraktikum, setNamaPraktikum] = useState("");
  const [totalMinggu, setTotalMinggu] = useState("10");
  const [jadwal, setJadwal] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validasi Identitas
    if (!nama.trim() || !nim.trim() || !kelas.trim()) {
      setErrorMsg("Nama, NIM, dan Kelas wajib diisi secara lengkap.");
      return;
    }

    // Validasi Minimal 1 Praktikum
    if (!namaPraktikum.trim()) {
      setErrorMsg("Wajib mendaftarkan minimal 1 mata kuliah praktikum pertama Anda.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          nim: nim.trim(),
          kelas: kelas.trim(),
          praktikumAwal: {
            nama: namaPraktikum.trim(),
            totalMinggu: parseInt(totalMinggu) || 10,
            jadwal: jadwal.trim() || "Sesuai Jadwal Lab"
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan data.");
      }

      onComplete();
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat menyimpan data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      {/* Ambient background decoration */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-blue-400/10 via-amber-300/10 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-2xl w-full">
        {/* Header Branding Universitas Ahmad Dahlan */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-white/80 backdrop-blur-md shadow-lg shadow-blue-950/5 border border-slate-100 mb-3 group hover:scale-105 transition-transform duration-300">
            <img
              src="/uad_logo.png"
              alt="Logo Universitas Ahmad Dahlan"
              className="w-20 h-20 object-contain drop-shadow-md"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#002b66] tracking-tight uppercase">
            Universitas Ahmad Dahlan
          </h1>
          <p className="text-sm font-semibold text-amber-700 mt-0.5">
            Fakultas Teknologi Industri · Program Studi Informatika
          </p>
          <p className="mt-2 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
            Selamat datang di Portal Generator Laporan Praktikum Otomatis (DOCX & PDF). Silakan lengkapi identitas mahasiswa dan mata kuliah praktikum pertama Anda.
          </p>
        </div>

        {/* Form Container */}
        <div className="paper-card-elevated p-8 sm:p-10 border border-slate-200/80 shadow-xl backdrop-blur-xs">
          {errorMsg && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bagian 1: Identitas Mahasiswa */}
            <div>
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-200/80 mb-4">
                <span className="w-7 h-7 rounded-lg bg-[#002b66] text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs">
                  1
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#002b66]">
                  Identitas Mahasiswa
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="paper-label">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Rafi Satya Prayoga"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="paper-input"
                  />
                </div>
                <div>
                  <label className="paper-label">Kelas</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: A / B / C"
                    value={kelas}
                    onChange={(e) => setKelas(e.target.value)}
                    className="paper-input"
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="paper-label">Nomor Induk Mahasiswa (NIM)</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 2400018208"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    className="paper-input font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    * Data ini akan otomatis tercantum pada cover dokumen laporan sesuai template standar.
                  </p>
                </div>
              </div>
            </div>

            {/* Bagian 2: Setup Praktikum Pertama */}
            <div>
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-200/80 mb-4">
                <span className="w-7 h-7 rounded-lg bg-[#002b66] text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs">
                  2
                </span>
                <h2 className="text-sm font-bold uppercase tracking-wider text-[#002b66]">
                  Pendaftaran Praktikum Pertama (Minimal 1)
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="paper-label">Nama Mata Kuliah Praktikum</label>
                  <div className="relative">
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Praktikum Strategi Algoritma"
                      value={namaPraktikum}
                      onChange={(e) => setNamaPraktikum(e.target.value)}
                      className="paper-input pl-9"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="paper-label">Total Minggu Praktikum</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={totalMinggu}
                      onChange={(e) => setTotalMinggu(e.target.value)}
                      className="paper-input"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Biasanya 8, 10, atau 14 minggu.
                    </p>
                  </div>

                  <div>
                    <label className="paper-label">Jadwal & Ruang Laboratorium</label>
                    <div className="relative">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        placeholder="Contoh: Senin 07.00-08.30 / Basis Data"
                        value={jadwal}
                        onChange={(e) => setJadwal(e.target.value)}
                        className="paper-input pl-9"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-sm shadow-md shadow-[#002b66]/20 font-bold"
              >
                {loading ? (
                  <span>Menyimpan & Mempersiapkan Sistem UAD...</span>
                ) : (
                  <>
                    <span>Simpan & Masuk ke Dashboard Praktikum</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Identitas dan praktikum Anda tersimpan di database lokal dan tidak perlu diinputkan ulang saat membuka aplikasi kembali.
        </p>
      </div>
    </div>
  );
}
