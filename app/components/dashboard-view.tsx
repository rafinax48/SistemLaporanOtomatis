"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Clock,
  Plus,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  X,
  Trash2,
  AlertTriangle,
  AlertCircle,
  Pencil,
  UserCheck,
  Camera,
  UploadCloud,
  User
} from "lucide-react";

interface Profile {
  id: string;
  nama: string;
  nim: string;
  kelas: string;
  foto?: string | null;
}

interface Praktikum {
  id: string;
  nama: string;
  totalMinggu: number;
  jadwal: string;
  completedCount: number;
  progressPercent: number;
}

export function DashboardView({
  initialProfile,
  initialPraktikumList,
}: {
  initialProfile: Profile;
  initialPraktikumList: Praktikum[];
}) {
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [list, setList] = useState<Praktikum[]>(initialPraktikumList);
  const [showAddModal, setShowAddModal] = useState(false);

  // State untuk modal konfirmasi hapus praktikum
  const [praktikumToDelete, setPraktikumToDelete] = useState<Praktikum | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // State untuk modal edit praktikum
  const [praktikumToEdit, setPraktikumToEdit] = useState<Praktikum | null>(null);
  const [editNamaPraktikum, setEditNamaPraktikum] = useState("");
  const [editJadwalPraktikum, setEditJadwalPraktikum] = useState("");
  const [isSavingPraktikum, setIsSavingPraktikum] = useState(false);
  const [editPraktikumError, setEditPraktikumError] = useState<string | null>(null);

  // State untuk modal edit profile user & foto profil
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editNamaUser, setEditNamaUser] = useState(profile.nama);
  const [editNimUser, setEditNimUser] = useState(profile.nim);
  const [editKelasUser, setEditKelasUser] = useState(profile.kelas);
  const [editFotoUser, setEditFotoUser] = useState<string | null>(profile.foto || null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [editProfileError, setEditProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form tambah praktikum
  const [namaBaru, setNamaBaru] = useState("");
  const [totalMingguBaru, setTotalMingguBaru] = useState("10");
  const [jadwalBaru, setJadwalBaru] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPraktikum = async () => {
    try {
      const res = await fetch("/api/praktikum");
      if (res.ok) {
        const data = await res.json();
        setList(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddPraktikum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!namaBaru.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/praktikum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: namaBaru,
          totalMinggu: parseInt(totalMingguBaru) || 10,
          jadwal: jadwalBaru || "Sesuai Jadwal Lab"
        })
      });

      if (res.ok) {
        setNamaBaru("");
        setJadwalBaru("");
        setShowAddModal(false);
        fetchPraktikum();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler Hapus Praktikum
  const handleConfirmDelete = async () => {
    if (!praktikumToDelete) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/praktikum/${praktikumToDelete.id}`, {
        method: "DELETE",
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Gagal menghapus praktikum dari database.");
      }

      setToastMessage(`Praktikum "${praktikumToDelete.nama}" berhasil dihapus.`);
      setTimeout(() => setToastMessage(null), 4000);
      setPraktikumToDelete(null);
      await fetchPraktikum();
    } catch (err: any) {
      setDeleteError(err.message || "Terjadi kesalahan saat menghapus.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Handler Edit Praktikum
  const handleEditPraktikumSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!praktikumToEdit || !editNamaPraktikum.trim()) return;

    setIsSavingPraktikum(true);
    setEditPraktikumError(null);
    try {
      const res = await fetch(`/api/praktikum/${praktikumToEdit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama: editNamaPraktikum.trim(),
          jadwal: editJadwalPraktikum.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui praktikum.");
      }

      setToastMessage(`Praktikum berhasil diperbarui menjadi "${editNamaPraktikum.trim()}".`);
      setTimeout(() => setToastMessage(null), 4000);
      setPraktikumToEdit(null);
      await fetchPraktikum();
    } catch (err: any) {
      setEditPraktikumError(err.message || "Terjadi kesalahan saat menyimpan.");
    } finally {
      setIsSavingPraktikum(false);
    }
  };

  // Handler Edit Profile User
  const handleEditProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNamaUser.trim() || !editNimUser.trim() || !editKelasUser.trim()) return;

    setIsSavingProfile(true);
    setEditProfileError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: profile.id,
          nama: editNamaUser.trim(),
          nim: editNimUser.trim(),
          kelas: editKelasUser.trim(),
          foto: editFotoUser
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memperbarui profil mahasiswa.");
      }

      if (data.profile) {
        setProfile(data.profile);
      }
      setToastMessage("Profil mahasiswa berhasil diperbarui.");
      setTimeout(() => setToastMessage(null), 4000);
      setShowEditProfileModal(false);
    } catch (err: any) {
      setEditProfileError(err.message || "Terjadi kesalahan saat menyimpan profil.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleFotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setEditProfileError("File harus berupa gambar (JPG/PNG/WEBP).");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setEditProfileError("Ukuran gambar maksimal 4MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditFotoUser(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const totalCompleted = list.reduce((acc, p) => acc + (p.completedCount || 0), 0);
  const totalRequired = list.reduce((acc, p) => acc + (p.totalMinggu || 0), 0);
  const overallPercent = totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0;
  const totalRemaining = Math.max(0, totalRequired - totalCompleted);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Top Navbar dengan Glassmorphism & Identitas Universitas Ahmad Dahlan */}
      <header className="glass-header sticky top-0 z-40 shadow-xs transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-amber-500 rounded-full blur opacity-25 group-hover:opacity-60 transition duration-300"></div>
              <img
                src="/uad_logo.png"
                alt="Logo Universitas Ahmad Dahlan"
                className="relative w-11 h-11 object-contain drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-extrabold text-[#002b66] text-base leading-tight tracking-tight uppercase">
                  Universitas Ahmad Dahlan
                </h1>
                <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
                  FTI Informatika
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Sistem Pembuatan Laporan Praktikum Otomatis
              </p>
            </div>
          </div>

          {/* Mahasiswa Profile Pill & Tombol Edit */}
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-900 leading-snug">{profile.nama}</p>
              <p className="text-[11px] font-mono text-slate-500">
                NIM: {profile.nim} • Kelas {profile.kelas}
              </p>
            </div>

            {/* Avatar Profile */}
            <div className="relative group">
              <div className="w-10 h-10 rounded-full bg-[#002b66] border-2 border-amber-400 flex items-center justify-center text-xs font-bold text-amber-300 shadow-sm overflow-hidden flex-shrink-0 transition-transform duration-200 group-hover:scale-105">
                {profile.foto ? (
                  <img
                    src={profile.foto}
                    alt={profile.nama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile.nama.charAt(0).toUpperCase()
                )}
              </div>
            </div>

            {/* Tombol Edit Profil */}
            <button
              onClick={() => {
                setEditNamaUser(profile.nama);
                setEditNimUser(profile.nim);
                setEditKelasUser(profile.kelas);
                setEditFotoUser(profile.foto || null);
                setEditProfileError(null);
                setShowEditProfileModal(true);
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-[#002b66] hover:bg-amber-50/80 border border-slate-200 hover:border-amber-300 transition-all shadow-2xs bg-white active:scale-95"
              title="Edit Profil Mahasiswa"
              aria-label="Edit Profil Mahasiswa"
            >
              <Pencil className="w-3.5 h-3.5 text-amber-600" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Toast Notifikasi */}
        {toastMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Hero Banner Section - UAD Deep Navy & Gold */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#002b66] via-[#093977] to-[#001f4d] text-white mb-8 relative overflow-hidden shadow-xl shadow-[#002b66]/15 border border-white/10">
          {/* Subtle Ambient Radial Glow */}
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-15 flex items-center justify-center pointer-events-none pr-8">
            <img src="/uad_logo.png" alt="UAD Watermark" className="w-72 h-72 object-contain" />
          </div>

          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-amber-300 border border-amber-400/30 backdrop-blur-md mb-3.5 shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Portal Akademik Praktikum UAD</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
              Selamat Datang, {profile.nama.split(" ")[0]}!
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-blue-100 leading-relaxed font-normal">
              Susun dan hasilkan dokumen laporan mingguan Anda dengan format resmi UAD. Dilengkapi ekstraksi kecerdasan buatan Google Gemini Vision untuk soal Pretest, observasi Laprak, serta ekspor DOCX & PDF siap cetak.
            </p>
          </div>
        </div>

        {/* 4 Interactive Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Card 1: Total Praktikum */}
          <div className="paper-card p-4 sm:p-5 flex items-center space-x-3.5 border-slate-200/90 hover:border-[#002b66]/30 transition-all">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#002b66] flex items-center justify-center flex-shrink-0 shadow-2xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Praktikum</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{list.length} Mata Kuliah</p>
            </div>
          </div>

          {/* Card 2: Laporan Selesai */}
          <div className="paper-card p-4 sm:p-5 flex items-center space-x-3.5 border-slate-200/90 hover:border-emerald-300 transition-all">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Laporan Selesai</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalCompleted} Dokumen</p>
            </div>
          </div>

          {/* Card 3: Progres Semester */}
          <div className="paper-card p-4 sm:p-5 flex items-center space-x-3.5 border-slate-200/90 hover:border-amber-300 transition-all">
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Layers className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Progres Total</p>
                <span className="text-xs font-extrabold text-amber-700">{overallPercent}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-700"
                  style={{ width: `${overallPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: Sisa Laporan */}
          <div className="paper-card p-4 sm:p-5 flex items-center space-x-3.5 border-slate-200/90 hover:border-indigo-300 transition-all">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Sisa Pelaporan</p>
              <p className="text-xl font-extrabold text-slate-900 mt-0.5">{totalRemaining} Minggu</p>
            </div>
          </div>
        </div>

        {/* Action Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-extrabold text-[#002b66] tracking-tight">
              Mata Kuliah Praktikum
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih praktikum untuk menginput laporan mingguan atau kelola mata kuliah yang ada
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary py-2.5 px-4 text-xs font-bold shadow-md shadow-[#002b66]/15"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Tambah Praktikum</span>
          </button>
        </div>

        {/* Grid Daftar Praktikum */}
        {list.length === 0 ? (
          <div className="paper-card p-12 text-center text-slate-500">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-slate-700">Belum ada praktikum yang terdaftar</p>
            <p className="text-xs text-slate-500 mt-1">Silakan klik tombol "Tambah Praktikum" di atas.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {list.map((item) => (
              <Link
                key={item.id}
                href={`/praktikum/${item.id}`}
                className="paper-card-interactive p-6 flex flex-col justify-between group relative overflow-hidden bg-white border-slate-200"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#002b66] flex items-center justify-center font-bold text-sm mb-4 group-hover:bg-[#002b66] group-hover:text-amber-400 transition-colors shadow-2xs">
                      <BookOpen className="w-5 h-5" />
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                        {item.totalMinggu} Minggu
                      </span>

                      {/* Tombol Edit Nama Praktikum */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setPraktikumToEdit(item);
                          setEditNamaPraktikum(item.nama);
                          setEditJadwalPraktikum(item.jadwal);
                          setEditPraktikumError(null);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#002b66] hover:bg-blue-50 transition-colors"
                        title="Edit Praktikum"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>

                      {/* Tombol Hapus Praktikum */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDeleteError(null);
                          setPraktikumToDelete(item);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Hapus Praktikum"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-slate-900 text-lg group-hover:text-[#002b66] transition-colors leading-snug">
                    {item.nama}
                  </h4>

                  <div className="mt-3 flex items-center space-x-2 text-xs text-slate-500">
                    <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                    <span className="truncate font-medium">{item.jadwal || "Sesuai Jadwal Lab"}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-slate-500 font-medium">Progres Laporan:</span>
                    <span className="font-extrabold text-slate-900">
                      {item.completedCount} / {item.totalMinggu} Selesai
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-[#002b66] to-blue-700 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.progressPercent || 0}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-end text-xs font-bold text-[#002b66] group-hover:text-amber-600 transition-all">
                    <span>Buka Tabel Mingguan</span>
                    <ArrowRight className="w-4 h-4 ml-1.5 transform group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Modal Edit Profile User */}
      {showEditProfileModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="paper-card-elevated max-w-md w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#002b66] flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#002b66]">Edit Profil Mahasiswa</h3>
                  <p className="text-[11px] text-slate-500">Data tercantum pada Cover Laporan</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditProfileModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editProfileError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editProfileError}</span>
              </div>
            )}

            <form onSubmit={handleEditProfileSubmit} className="space-y-4">
              {/* Unggah Foto Profil Mahasiswa */}
              <div className="flex items-center space-x-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="relative w-16 h-16 rounded-full bg-[#002b66] border-2 border-amber-400/50 overflow-hidden flex items-center justify-center text-lg font-bold text-amber-300 flex-shrink-0 shadow-xs">
                  {editFotoUser ? (
                    <img src={editFotoUser} alt="Foto Profil" className="w-full h-full object-cover" />
                  ) : (
                    editNamaUser ? editNamaUser.charAt(0).toUpperCase() : <User className="w-6 h-6 text-amber-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <label className="paper-label text-[11px] mb-0.5">Foto Profil Mahasiswa</label>
                  <p className="text-[10px] text-slate-500 mb-2">Maksimal 4MB (JPG, PNG, WEBP)</p>
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
                      className="px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:border-[#002b66] hover:text-[#002b66] text-xs font-semibold text-slate-700 flex items-center space-x-1 transition-colors shadow-2xs"
                    >
                      <Camera className="w-3.5 h-3.5 text-amber-500" />
                      <span>{editFotoUser ? "Ganti Foto" : "Unggah Foto"}</span>
                    </button>
                    {editFotoUser && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditFotoUser(null);
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

              <div>
                <label className="paper-label">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editNamaUser}
                  onChange={(e) => setEditNamaUser(e.target.value)}
                  className="paper-input"
                  placeholder="Contoh: Rafi Satya Prayoga"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="paper-label">NIM</label>
                  <input
                    type="text"
                    required
                    value={editNimUser}
                    onChange={(e) => setEditNimUser(e.target.value)}
                    className="paper-input font-mono"
                    placeholder="Contoh: 2400018208"
                  />
                </div>
                <div>
                  <label className="paper-label">Kelas</label>
                  <input
                    type="text"
                    required
                    value={editKelasUser}
                    onChange={(e) => setEditKelasUser(e.target.value)}
                    className="paper-input"
                    placeholder="Contoh: A / B / C"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Perubahan profil akan langsung diterapkan pada cover laporan mingguan berikutnya.
              </p>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSavingProfile}
                  onClick={() => setShowEditProfileModal(false)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn-primary py-2 px-5 text-xs font-bold"
                >
                  {isSavingProfile ? "Menyimpan..." : "Simpan Profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Praktikum */}
      {praktikumToEdit && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="paper-card-elevated max-w-md w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#002b66] flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#002b66]">Edit Praktikum</h3>
                  <p className="text-[11px] text-slate-500">Perbarui nama dan jadwal praktikum</p>
                </div>
              </div>
              <button
                onClick={() => setPraktikumToEdit(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {editPraktikumError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{editPraktikumError}</span>
              </div>
            )}

            <form onSubmit={handleEditPraktikumSubmit} className="space-y-4">
              <div>
                <label className="paper-label">Nama Mata Kuliah Praktikum</label>
                <input
                  type="text"
                  required
                  value={editNamaPraktikum}
                  onChange={(e) => setEditNamaPraktikum(e.target.value)}
                  className="paper-input"
                  placeholder="Contoh: Praktikum Strategi Algoritma"
                />
              </div>

              <div>
                <label className="paper-label">Jadwal & Ruang Lab</label>
                <input
                  type="text"
                  value={editJadwalPraktikum}
                  onChange={(e) => setEditJadwalPraktikum(e.target.value)}
                  className="paper-input"
                  placeholder="Contoh: Senin 07.00-08.30 / Basis Data"
                />
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  disabled={isSavingPraktikum}
                  onClick={() => setPraktikumToEdit(null)}
                  className="btn-secondary py-2 px-4 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPraktikum}
                  className="btn-primary py-2 px-5 text-xs font-bold"
                >
                  {isSavingPraktikum ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Peringatan Hapus Praktikum */}
      {praktikumToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="paper-card-elevated max-w-lg w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 duration-200 border-rose-200">
            {/* Header Modal */}
            <div className="flex items-start space-x-3.5 pb-4 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 leading-tight">
                  Peringatan: Konfirmasi Hapus Praktikum
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tindakan ini permanen dan akan menghapus seluruh data terkait dari database.
                </p>
              </div>
            </div>

            {/* Error Message if any */}
            {deleteError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {/* Detail Data Tercover dari Database */}
            <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Data yang Tercover di Database:
              </span>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mata Kuliah Praktikum:</span>
                  <span className="font-bold text-slate-900">{praktikumToDelete.nama}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pertemuan:</span>
                  <span className="font-medium text-slate-700">{praktikumToDelete.totalMinggu} Minggu</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Jadwal:</span>
                  <span className="font-medium text-slate-700">{praktikumToDelete.jadwal || "Sesuai Jadwal Lab"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Laporan Selesai:</span>
                  <span className="font-bold text-[#002b66]">
                    {praktikumToDelete.completedCount} dari {praktikumToDelete.totalMinggu} minggu
                  </span>
                </div>
              </div>
            </div>

            {/* Kotak Peringatan */}
            <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
              <p className="font-semibold flex items-center space-x-1.5 text-amber-800 mb-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Pastikan sebelum menghapus:</span>
              </p>
              Semua laporan mingguan (draft materi, foto pretest, analisis, kode program, dan dokumen DOCX/PDF) yang terhubung dengan praktikum ini akan dihapus permanen dari database.
            </div>

            {/* Tombol Aksi */}
            <div className="mt-6 flex items-center justify-end space-x-3">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setPraktikumToDelete(null)}
                className="btn-secondary py-2 px-4 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="btn-danger py-2 px-4 text-xs font-bold"
              >
                {isDeleting ? "Menghapus..." : "Ya, Hapus Praktikum Ini"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Tambah Praktikum */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="paper-card-elevated max-w-md w-full p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div>
                <h3 className="font-bold text-base text-[#002b66]">Tambah Praktikum Baru</h3>
                <p className="text-xs text-slate-500">Universitas Ahmad Dahlan</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPraktikum} className="space-y-4">
              <div>
                <label className="paper-label">Nama Mata Kuliah Praktikum</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Praktikum Basis Data"
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  className="paper-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="paper-label">Total Minggu</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={totalMingguBaru}
                    onChange={(e) => setTotalMingguBaru(e.target.value)}
                    className="paper-input"
                  />
                </div>

                <div>
                  <label className="paper-label">Jadwal / Lab</label>
                  <input
                    type="text"
                    placeholder="Contoh: Rabu 10.00 / Lab 2"
                    value={jadwalBaru}
                    onChange={(e) => setJadwalBaru(e.target.value)}
                    className="paper-input"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary py-2 px-5 text-xs"
                >
                  {isSubmitting ? "Menyimpan..." : "Tambahkan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


