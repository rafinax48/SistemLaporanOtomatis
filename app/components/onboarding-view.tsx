"use client";

import { useState, useRef } from "react";
import {
  GraduationCap,
  BookOpen,
  Clock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Key,
  Cpu,
  ExternalLink,
  Camera,
  User,
  X
} from "lucide-react";

export function OnboardingView({ onComplete }: { onComplete: () => void }) {
  // Identitas Mahasiswa & Foto Profil
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [kelas, setKelas] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Setup Praktikum Pertama (Minimal 1)
  const [namaPraktikum, setNamaPraktikum] = useState("");
  const [totalMinggu, setTotalMinggu] = useState("10");
  const [jadwal, setJadwal] = useState("");

  // Konfigurasi Model AI & Google Gemini API Key
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.8-flash");

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErrorMsg("File foto harus berupa gambar (JPG, PNG, atau WEBP).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setErrorMsg("Ukuran foto maksimal 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setFoto(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

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
      // 1. Simpan Profil Mahasiswa & Praktikum Awal
      const resProfile = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: nama.trim(),
          nim: nim.trim(),
          kelas: kelas.trim(),
          foto: foto || null,
          praktikumAwal: {
            nama: namaPraktikum.trim(),
            totalMinggu: Math.max(1, parseInt(totalMinggu) || 10),
            jadwal: jadwal.trim() || "Sesuai Jadwal Lab"
          }
        })
      });

      const profileData = await resProfile.json();
      if (!resProfile.ok) {
        throw new Error(profileData.error || "Gagal menyimpan data profil mahasiswa.");
      }

      // 2. Simpan Konfigurasi AI & API Key (Jika diisi / simpan model default gemini-3.8-flash)
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          selectedModel: selectedModel || "gemini-3.8-flash"
        })
      }).catch((e) => console.warn("Settings save error in onboarding:", e));

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
            Selamat datang di Portal Generator Laporan Praktikum Otomatis (DOCX & PDF). Silakan lengkapi identitas mahasiswa, mata kuliah praktikum pertama, dan konfigurasi AI Gemini Anda.
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

              {/* Upload Foto Profil (Opsional) */}
              <div className="flex items-center space-x-4 p-3.5 mb-4 rounded-xl bg-slate-50 border border-slate-200/90">
                <div className="relative w-14 h-14 rounded-full bg-[#002b66] border-2 border-amber-400 overflow-hidden flex items-center justify-center text-sm font-bold text-amber-300 flex-shrink-0 shadow-xs">
                  {foto ? (
                    <img src={foto} alt="Foto Profil" className="w-full h-full object-cover" />
                  ) : nama ? (
                    nama.charAt(0).toUpperCase()
                  ) : (
                    <User className="w-5 h-5 text-amber-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="paper-label text-[11px] mb-0.5">Foto Profil Mahasiswa (Opsional)</label>
                  <p className="text-[10px] text-slate-500 mb-1.5">Maksimal 4MB (JPG, PNG, WEBP)</p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handleFotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#002b66] hover:text-[#002b66] text-xs font-semibold text-slate-700 flex items-center space-x-1.5 transition-colors shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      <span>{foto ? "Ganti Foto" : "Unggah Foto Profil"}</span>
                    </button>
                    {foto && (
                      <button
                        type="button"
                        onClick={() => {
                          setFoto(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="px-2 py-1 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                      >
                        Hapus
                      </button>
                    )}
                  </div>
                </div>
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
                    * Data ini akan otomatis tercantum pada cover dokumen laporan sesuai template standar UAD.
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
                  <div className="relative flex items-center">
                    <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Praktikum Strategi Algoritma"
                      value={namaPraktikum}
                      onChange={(e) => setNamaPraktikum(e.target.value)}
                      className="paper-input pl-10"
                      style={{ paddingLeft: "2.6rem" }}
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
                    <div className="relative flex items-center">
                      <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                      <input
                        type="text"
                        placeholder="Contoh: Senin 07.00-08.30 / Basis Data"
                        value={jadwal}
                        onChange={(e) => setJadwal(e.target.value)}
                        className="paper-input pl-10"
                        style={{ paddingLeft: "2.6rem" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 3: Konfigurasi AI & Google Gemini API Key */}
            <div>
              <div className="flex items-center space-x-2.5 pb-3 border-b border-slate-200/80 mb-4">
                <span className="w-7 h-7 rounded-lg bg-[#002b66] text-amber-300 font-bold text-xs flex items-center justify-center shadow-xs">
                  3
                </span>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-[#002b66]">
                    Pengaturan Model AI & Google Gemini API Key
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Bisa Diisi Sekarang / Nanti
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {/* Pilihan Model */}
                <div>
                  <label className="paper-label mb-2 block">Pilihan Model AI</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Model 1: gemini-3.8-flash */}
                    <label
                      onClick={() => setSelectedModel("gemini-3.8-flash")}
                      className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                        selectedModel === "gemini-3.8-flash"
                          ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="onboardingModel"
                        value="gemini-3.8-flash"
                        checked={selectedModel === "gemini-3.8-flash"}
                        onChange={() => setSelectedModel("gemini-3.8-flash")}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">Gemini 3.8 Flash</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-100 text-emerald-800">
                            Rekomendasi
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Cepat, vision cerdas, hemat kuota gratis Google AI Studio.
                        </p>
                      </div>
                    </label>

                    {/* Model 2: gemini-3.1-pro */}
                    <label
                      onClick={() => setSelectedModel("gemini-3.1-pro")}
                      className={`cursor-pointer p-3.5 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                        selectedModel === "gemini-3.1-pro"
                          ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="onboardingModel"
                        value="gemini-3.1-pro"
                        checked={selectedModel === "gemini-3.1-pro"}
                        onChange={() => setSelectedModel("gemini-3.1-pro")}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="text-xs font-bold text-slate-900">Gemini 3.1 Pro</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-blue-100 text-blue-800">
                            Pro Flagship
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                          Penalaran akademis mendalam untuk praktikum kompleks.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Input Google Gemini API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="paper-label flex items-center space-x-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-600 inline" />
                      <span>Google Gemini API Key (Opsional)</span>
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-[#002b66] hover:text-amber-600 font-bold inline-flex items-center space-x-1"
                    >
                      <span>Ambil Kunci Gratis di Google AI Studio</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative flex items-center">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none z-10" />
                    <input
                      type="password"
                      placeholder="AIzaSy... (Kosongkan jika ingin memakai kunci default server .env)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="paper-input pl-10 font-mono text-xs"
                      style={{ paddingLeft: "2.6rem" }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1.5">
                    * Jika dikosongkan, sistem otomatis menggunakan kunci default server. Anda juga dapat mengubah atau memasukkan API Key kapan saja melalui tombol ⚙️ di dashboard.
                  </p>
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
          Identitas, foto, praktikum, dan kunci API Anda tersimpan aman di database lokal SQLite dan tidak perlu diinputkan ulang saat membuka aplikasi kembali.
        </p>
      </div>
    </div>
  );
}
