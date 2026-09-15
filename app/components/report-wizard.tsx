"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UploadCloud,
  CheckCircle2,
  Sparkles,
  RotateCcw,
  ArrowRight,
  FileText,
  FileDown,
  Code2,
  Trash2,
  Clock,
  Eye,
  Check,
  AlertCircle,
  Plus,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  Camera
} from "lucide-react";

export interface OrderedImage {
  id: string;
  order: number;
  url: string;
  caption?: string;
}

export interface OrderedCode {
  id: string;
  order: number;
  title?: string;
  code: string;
}

interface Praktikum {
  id: string;
  nama: string;
  jadwal: string;
}

interface InitialData {
  id: string;
  materi?: string | null;
  tanggal?: string | null;
  tempat?: string | null;
  imgPretest?: string | null;
  pretestQ?: string | null;
  imgLaprak?: string | null;
  kodeProgram?: string | null;
  laprakBahan?: string | null;
  laprakLangkah?: string | null;
  laprakAnalisis?: string | null;
  imgPosttest?: string | null;
  posttestTujuan?: string | null;
  kodePosttest?: string | null;
  finalFilename?: string | null;
  docxPath?: string | null;
  pdfPath?: string | null;
  status: string;
}

function parseInitialImages(raw: string | null | undefined): OrderedImage[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map((item, idx) => ({
        id: item.id || `img_${idx + 1}_${Date.now()}`,
        order: typeof item.order === "number" ? item.order : idx + 1,
        url: item.url || item.image || "",
        caption: item.caption || ""
      })).sort((a, b) => a.order - b.order);
    }
  } catch {}

  if (typeof raw === "string" && raw.trim()) {
    return [{
      id: `img_1_${Date.now()}`,
      order: 1,
      url: raw,
      caption: ""
    }];
  }
  return [];
}

function parseInitialCodes(
  raw: string | null | undefined,
  defaultCode: string,
  defaultTitle: string = "Program Utama"
): OrderedCode[] {
  if (!raw) {
    return [{
      id: `code_1_${Date.now()}`,
      order: 1,
      title: defaultTitle,
      code: defaultCode
    }];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.map((item, idx) => ({
        id: item.id || `code_${idx + 1}_${Date.now()}`,
        order: typeof item.order === "number" ? item.order : idx + 1,
        title: item.title || `Program ${idx + 1}`,
        code: item.code || ""
      })).sort((a, b) => a.order - b.order);
    }
  } catch {}

  if (typeof raw === "string" && raw.trim()) {
    return [{
      id: `code_1_${Date.now()}`,
      order: 1,
      title: defaultTitle,
      code: raw
    }];
  }

  return [{
    id: `code_1_${Date.now()}`,
    order: 1,
    title: defaultTitle,
    code: defaultCode
  }];
}

// Subkomponen: Urutan Input Gambar
function OrderedImageSection({
  images,
  onChange,
  label,
  sectionPrefix
}: {
  images: OrderedImage[];
  onChange: (imgs: OrderedImage[]) => void;
  label: string;
  sectionPrefix: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const [replacingId, setReplacingId] = useState<string | null>(null);

  const handleMultipleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    let loadedCount = 0;
    const newItems: OrderedImage[] = [];

    fileList.forEach((file, fIdx) => {
      const reader = new FileReader();
      reader.onload = () => {
        newItems.push({
          id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          order: images.length + fIdx + 1,
          url: reader.result as string,
          caption: ""
        });
        loadedCount++;
        if (loadedCount === fileList.length) {
          const combined = [...images, ...newItems].sort((a, b) => a.order - b.order);
          // Re-normalize order numbers
          const reordered = combined.map((item, idx) => ({ ...item, order: idx + 1 }));
          onChange(reordered);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleReplaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !replacingId) return;

    const reader = new FileReader();
    reader.onload = () => {
      const updated = images.map((img) =>
        img.id === replacingId ? { ...img, url: reader.result as string } : img
      );
      onChange(updated);
      setReplacingId(null);
    };
    reader.readAsDataURL(file);

    if (replaceInputRef.current) replaceInputRef.current.value = "";
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const items = [...images];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    const reordered = items.map((it, idx) => ({ ...it, order: idx + 1 }));
    onChange(reordered);
  };

  const moveDown = (index: number) => {
    if (index >= images.length - 1) return;
    const items = [...images];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    const reordered = items.map((it, idx) => ({ ...it, order: idx + 1 }));
    onChange(reordered);
  };

  const setManualOrder = (id: string, newOrderVal: number) => {
    const target = images.find((i) => i.id === id);
    if (!target) return;
    const updated = images.map((i) => (i.id === id ? { ...i, order: newOrderVal } : i));
    updated.sort((a, b) => a.order - b.order);
    onChange(updated);
  };

  const updateCaption = (id: string, caption: string) => {
    const updated = images.map((i) => (i.id === id ? { ...i, caption } : i));
    onChange(updated);
  };

  const removeImage = (id: string) => {
    const filtered = images.filter((i) => i.id !== id);
    const reordered = filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
    onChange(reordered);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="paper-label text-slate-800 flex items-center space-x-2">
          <ImageIcon className="w-4 h-4 text-[#002b66]" />
          <span>{label}</span>
          <span className="text-[11px] font-normal text-slate-500">
            ({images.length} gambar terpasang)
          </span>
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[#002b66] hover:bg-blue-100 text-xs font-bold transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Gambar</span>
        </button>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        onChange={handleMultipleUpload}
        className="hidden"
      />

      <input
        type="file"
        ref={replaceInputRef}
        accept="image/*"
        onChange={handleReplaceUpload}
        className="hidden"
      />

      {images.length === 0 ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-40 border-2 border-dashed border-slate-300 hover:border-[#002b66] rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-[#002b66] transition-all bg-slate-50 hover:bg-blue-50/40"
        >
          <UploadCloud className="w-8 h-8 mb-2 text-[#002b66]" />
          <span className="text-xs font-bold text-slate-800">Unggah Gambar (Bisa Lebih dari 1)</span>
          <span className="text-[11px] text-slate-400 mt-0.5">
            JPG, PNG, atau Screenshot · Urutan dapat diatur bebas
          </span>
        </button>
      ) : (
        <div className="space-y-3">
          {images.map((item, index) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 transition-all hover:border-slate-300"
            >
              {/* Badge Urutan & Kontrol Posisi */}
              <div className="flex items-center space-x-2 flex-shrink-0">
                <span className="w-8 h-8 rounded-lg bg-[#002b66] text-amber-300 font-extrabold text-xs flex items-center justify-center shadow-xs">
                  #{item.order}
                </span>
                <div className="flex flex-col space-y-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    title="Pindahkan Urutan ke Atas"
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => moveDown(index)}
                    title="Pindahkan Urutan ke Bawah"
                    className="p-1 rounded bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Preview Gambar Thumbnail */}
              <div className="relative w-28 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
                <img src={item.url} alt={`Urutan ${item.order}`} className="w-full h-full object-cover" />
              </div>

              {/* Input Keterangan & Nomor Urut */}
              <div className="flex-1 min-w-0 space-y-1.5 w-full">
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-bold text-slate-600">Urutan Laporan:</span>
                  <input
                    type="number"
                    min={1}
                    value={item.order}
                    onChange={(e) => setManualOrder(item.id, parseInt(e.target.value) || 1)}
                    className="w-16 px-2 py-0.5 text-xs font-bold rounded border border-slate-300 text-center text-slate-800"
                  />
                  <span className="text-[11px] text-slate-400 italic">
                    (Muncul sebagai Gambar {sectionPrefix}.{item.order})
                  </span>
                </div>
                <input
                  type="text"
                  value={item.caption || ""}
                  onChange={(e) => updateCaption(item.id, e.target.value)}
                  placeholder="Keterangan / Caption gambar (contoh: Hasil Kompilasi Program)"
                  className="paper-input text-xs py-1.5"
                />
              </div>

              {/* Tombol Ganti & Hapus */}
              <div className="flex items-center space-x-2 flex-shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => {
                    setReplacingId(item.id);
                    replaceInputRef.current?.click();
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
                >
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={() => removeImage(item.id)}
                  className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Hapus gambar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="text-[11px] text-slate-500 italic">
          * Gambar akan dimasukkan ke dalam dokumen Word & PDF persis sesuai urutan nomor di atas (#1, #2, dst).
        </p>
      )}
    </div>
  );
}

// Subkomponen: Urutan Input Kode Program
function OrderedCodeSection({
  codes,
  onChange,
  label,
  sectionPrefix,
  defaultTemplate
}: {
  codes: OrderedCode[];
  onChange: (cds: OrderedCode[]) => void;
  label: string;
  sectionPrefix: string;
  defaultTemplate: string;
}) {
  const addCode = () => {
    const newOrder = codes.length + 1;
    const updated = [
      ...codes,
      {
        id: `code_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        order: newOrder,
        title: `Program ${newOrder}`,
        code: defaultTemplate
      }
    ];
    onChange(updated);
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const items = [...codes];
    const temp = items[index];
    items[index] = items[index - 1];
    items[index - 1] = temp;
    const reordered = items.map((it, idx) => ({ ...it, order: idx + 1 }));
    onChange(reordered);
  };

  const moveDown = (index: number) => {
    if (index >= codes.length - 1) return;
    const items = [...codes];
    const temp = items[index];
    items[index] = items[index + 1];
    items[index + 1] = temp;
    const reordered = items.map((it, idx) => ({ ...it, order: idx + 1 }));
    onChange(reordered);
  };

  const setManualOrder = (id: string, newOrderVal: number) => {
    const updated = codes.map((c) => (c.id === id ? { ...c, order: newOrderVal } : c));
    updated.sort((a, b) => a.order - b.order);
    onChange(updated);
  };

  const updateTitle = (id: string, title: string) => {
    const updated = codes.map((c) => (c.id === id ? { ...c, title } : c));
    onChange(updated);
  };

  const updateCode = (id: string, code: string) => {
    const updated = codes.map((c) => (c.id === id ? { ...c, code } : c));
    onChange(updated);
  };

  const removeCode = (id: string) => {
    if (codes.length <= 1) return;
    const filtered = codes.filter((c) => c.id !== id);
    const reordered = filtered.map((item, idx) => ({ ...item, order: idx + 1 }));
    onChange(reordered);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="paper-label text-slate-800 flex items-center space-x-2">
          <Code2 className="w-4 h-4 text-[#002b66]" />
          <span>{label}</span>
          <span className="text-[11px] font-normal text-slate-500">
            ({codes.length} file kode terpasang)
          </span>
        </label>
        <button
          type="button"
          onClick={addCode}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-[#002b66] hover:bg-blue-100 text-xs font-bold transition-colors shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Kode Program</span>
        </button>
      </div>

      <div className="space-y-4">
        {codes.map((item, index) => (
          <div
            key={item.id}
            className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs"
          >
            {/* Header Blok Kode */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <span className="w-7 h-7 rounded-lg bg-[#002b66] text-amber-300 font-extrabold text-xs flex items-center justify-center">
                  #{item.order}
                </span>
                <span className="text-xs font-bold text-slate-800">
                  Kode {sectionPrefix}.{item.order}:
                </span>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateTitle(item.id, e.target.value)}
                  placeholder="Judul / Nama File (contoh: main.cpp)"
                  className="px-2.5 py-1 text-xs font-bold rounded border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:border-[#002b66] w-48 sm:w-64"
                />
              </div>

              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <span className="text-[11px] font-semibold text-slate-500">Urutan:</span>
                  <input
                    type="number"
                    min={1}
                    value={item.order}
                    onChange={(e) => setManualOrder(item.id, parseInt(e.target.value) || 1)}
                    className="w-12 px-1.5 py-0.5 text-xs font-bold rounded border border-slate-300 text-center text-slate-800"
                  />
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveUp(index)}
                    title="Pindahkan Urutan ke Atas"
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === codes.length - 1}
                    onClick={() => moveDown(index)}
                    title="Pindahkan Urutan ke Bawah"
                    className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-700"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {codes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeCode(item.id)}
                    className="p-1 text-rose-600 hover:bg-rose-50 rounded transition-colors ml-2"
                    title="Hapus blok kode ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Code Editor Textarea */}
            <div className="p-3 bg-slate-900">
              <textarea
                rows={7}
                value={item.code}
                onChange={(e) => updateCode(item.id, e.target.value)}
                className="w-full bg-transparent text-emerald-400 font-mono text-xs leading-relaxed focus:outline-hidden resize-y"
                placeholder="Tempelkan source code di sini..."
              />
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-slate-500 italic">
        * Tiap blok kode program di atas akan dibuatkan tabel kode tersendiri di dalam laporan Word & PDF sesuai nomor urutnya.
      </p>
    </div>
  );
}

function formatLangkahKerja(text: string): string {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      const cleaned = trimmed.replace(/^(?:\d+[\.\)]\s*|[a-zA-Z][\.\)]\s*|[•\-\*]\s*)/, "").trim();
      return `- ${cleaned}`;
    })
    .filter(Boolean)
    .join("\n");
}

function LivePreviewPanel({
  currentStep,
  praktikum,
  mingguKe,
  profile,
  materi,
  tempat,
  tanggal,
  pretestImages,
  pretestQ,
  laprakCodes,
  laprakImages,
  laprakBahan,
  laprakLangkah,
  laprakAnalisis,
  posttestCodes,
  posttestImages,
  posttestTujuan,
  onConfirmNext,
  onResetCurrent,
}: {
  currentStep: number;
  praktikum: Praktikum;
  mingguKe: number;
  profile?: { nama?: string; nim?: string; kelas?: string } | null;
  materi: string;
  tempat: string;
  tanggal: string;
  pretestImages: OrderedImage[];
  pretestQ: string;
  laprakCodes: OrderedCode[];
  laprakImages: OrderedImage[];
  laprakBahan: string;
  laprakLangkah: string;
  laprakAnalisis: string;
  posttestCodes: OrderedCode[];
  posttestImages: OrderedImage[];
  posttestTujuan: string;
  onConfirmNext: () => void;
  onResetCurrent: () => void;
}) {
  const [viewMode, setViewMode] = useState<"grid" | "sheet">("grid");
  const [zoomedPage, setZoomedPage] = useState<number | null>(null);

  // Parse Pretest Questions to Uppercase Letters (A, B, C...)
  const pretestQuestionsList = pretestQ
    ? pretestQ
        .split("\n")
        .map((q) => q.trim())
        .filter(Boolean)
        .map((q, idx) => {
          const letter = String.fromCharCode(65 + idx);
          const clean = q.replace(/^(?:[0-9]+[\.\)]\s*|[a-zA-Z][\.\)]\s*|[•\-\*]\s*)/, "").trim();
          return `${letter}. ${clean}`;
        })
    : [
        "A. Jelaskan tujuan dari praktikum ini.",
        "B. Sebutkan konsep dasar yang digunakan."
      ];

  // Clean steps
  const stepsList = laprakLangkah
    ? laprakLangkah
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => {
          const clean = s.replace(/^(?:\d+[\.\)]\s*|[a-zA-Z][\.\)]\s*|[•\-\*]\s*)/, "").trim();
          return `- ${clean}`;
        })
    : [
        "- Menyiapkan program C++ untuk menerima input data.",
        "- Melakukan kompilasi dan pengujian algoritma.",
        "- Mengamati dan mencatat hasil eksekusi program."
      ];

  // Clean schedule & room (avoid duplicate schedule)
  const cleanTgl = (tanggal || "").trim();
  const cleanTmp = (tempat || "").trim();
  let coverJadwal = cleanTgl;
  if (cleanTmp && !cleanTgl.toLowerCase().includes(cleanTmp.toLowerCase())) {
    coverJadwal = `${cleanTgl} / ${cleanTmp}`;
  }

  // Calculate dynamic pages
  // Page 1: Cover
  // Page 2: Pretest & Lampiran 1 (or empty lampiran box)
  // Page 3..N: Additional Pretest Images if > 1
  // Page Next: Hasil Praktikum
  // Page Final: Post Test
  const extraLampiranCount = Math.max(0, pretestImages.length - 1);
  const totalDocPages = 1 + 1 + extraLampiranCount + 1 + 1;

  // Render individual page components
  const renderCoverPage = (isMini = false) => (
    <div
      className={`bg-white text-slate-800 ${isMini ? "p-3 text-[7.5px]" : "p-8 text-[11pt]"} flex flex-col justify-between h-full select-none`}
      style={{
        fontFamily: "Calibri, Carlito, 'Segoe UI', sans-serif",
        lineHeight: "1.35",
      }}
    >
      <div className="text-center space-y-1">
        <div className={`font-bold uppercase tracking-wider ${isMini ? "text-[8px]" : "text-sm"} text-slate-900`}>
          LAPORAN PRAKTIKUM
        </div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-sm"} text-[#002b66]`}>
          {praktikum.nama}
        </div>
        <div className={`font-bold uppercase ${isMini ? "text-[7.5px]" : "text-xs"} text-slate-900`}>
          {materi.toUpperCase()}
        </div>
        <div className={`font-bold ${isMini ? "text-[7px]" : "text-xs"} text-slate-800`}>
          {coverJadwal}
        </div>
      </div>

      <div className="flex justify-center my-3">
        <img
          src="/uad_logo.png"
          alt="Logo UAD"
          className={`${isMini ? "w-10 h-10" : "w-24 h-24"} object-contain drop-shadow-xs`}
        />
      </div>

      <div className="text-center my-2 space-y-0.5">
        <div className={`font-bold ${isMini ? "text-[7.5px]" : "text-xs"} text-slate-900`}>
          Disusun Oleh:
        </div>
        {/* NAMA DAN NIM TIDAK BOLD & TANPA KELAS */}
        <div className={`font-normal ${isMini ? "text-[7.5px]" : "text-xs"} text-slate-900`}>
          {profile?.nama || "Rafi Satya Prayoga"}
        </div>
        <div className={`font-normal ${isMini ? "text-[7.5px]" : "text-xs"} text-slate-900 font-mono`}>
          {profile?.nim || "2400018208"}
        </div>
      </div>

      <div className="text-center mt-auto space-y-0.5 pt-2">
        <div className={`font-bold uppercase ${isMini ? "text-[6.5px]" : "text-[10pt]"} text-slate-900`}>
          PROGRAM STUDI S1 INFORMATIKA
        </div>
        <div className={`font-bold uppercase ${isMini ? "text-[6.5px]" : "text-[10pt]"} text-slate-900`}>
          FAKULTAS TEKNOLOGI INDUSTRI
        </div>
        <div className={`font-bold uppercase ${isMini ? "text-[6.5px]" : "text-[10pt]"} text-slate-900`}>
          UNIVERSITAS AHMAD DAHLAN
        </div>
        <div className={`font-bold ${isMini ? "text-[6.5px]" : "text-[10pt]"} text-slate-900`}>
          2026
        </div>
      </div>
    </div>
  );

  const renderPretestPage1 = (isMini = false) => (
    <div
      className={`bg-white text-slate-800 ${isMini ? "p-3 text-[7.5px]" : "p-8 text-[11pt]"} flex flex-col justify-start h-full select-none space-y-3`}
      style={{
        fontFamily: "Calibri, Carlito, 'Segoe UI', sans-serif",
        lineHeight: "1.35",
      }}
    >
      {/* Title Pretest BOLD */}
      <div className={`font-bold ${isMini ? "text-[9px]" : "text-sm"} text-slate-900`}>
        Pre Test
      </div>

      {/* Pertanyaan Pretest TIDAK BOLD & Abjad Kapital (A, B, C) */}
      <div className="space-y-1 font-normal text-slate-800">
        {pretestQuestionsList.map((q, qIdx) => (
          <div key={qIdx} className="leading-snug">
            {q}
          </div>
        ))}
      </div>

      {/* LAMPIRAN Header TIDAK BOLD */}
      <div className="text-center pt-2">
        <div className={`font-normal tracking-wide uppercase ${isMini ? "text-[8px]" : "text-xs"} text-slate-900`}>
          LAMPIRAN
        </div>
        <div className={`font-normal italic ${isMini ? "text-[7px]" : "text-[10pt]"} text-slate-600`}>
          Lampiran A, B, dan C
        </div>
      </div>

      {/* Gambar Lampiran 1 */}
      <div className="mt-2 text-center flex-1 flex flex-col justify-center items-center">
        {pretestImages[0] ? (
          <div className="w-full">
            <img
              src={pretestImages[0].url}
              alt="Lampiran 1"
              className={`${isMini ? "max-h-24" : "max-h-56"} max-w-full object-contain mx-auto rounded border border-slate-200`}
            />
            <p className={`text-slate-600 italic mt-1 font-normal ${isMini ? "text-[6.5px]" : "text-[10pt]"}`}>
              Gambar 1.1: {pretestImages[0].caption ? pretestImages[0].caption.replace(/#\s*\d+/g, "").trim() : "Jawaban PreTest Lembar 1"}
            </p>
          </div>
        ) : (
          <div className={`w-full border-2 border-dashed border-slate-200 rounded p-4 text-center text-slate-400 ${isMini ? "text-[7px]" : "text-xs"}`}>
            (Belum ada gambar lembar pretest)
          </div>
        )}
      </div>
    </div>
  );

  const renderExtraLampiranPage = (imgItem: OrderedImage, pageNum: number, isMini = false) => (
    <div
      className={`bg-white text-slate-800 ${isMini ? "p-3 text-[7.5px]" : "p-8 text-[11pt]"} flex flex-col justify-between h-full select-none`}
      style={{
        fontFamily: "Calibri, Carlito, 'Segoe UI', sans-serif",
        lineHeight: "1.35",
      }}
    >
      <div className="text-center pt-1">
        <div className={`font-normal tracking-wide uppercase ${isMini ? "text-[8px]" : "text-xs"} text-slate-900`}>
          LAMPIRAN (LANJUTAN)
        </div>
        <div className={`font-normal italic ${isMini ? "text-[7px]" : "text-[10pt]"} text-slate-600`}>
          Lampiran Jawaban Lembar {pageNum}
        </div>
      </div>

      <div className="my-auto text-center">
        <img
          src={imgItem.url}
          alt={`Lampiran ${pageNum}`}
          className={`${isMini ? "max-h-36" : "max-h-72"} max-w-full object-contain mx-auto rounded border border-slate-200`}
        />
        <p className={`text-slate-600 italic mt-1.5 font-normal ${isMini ? "text-[6.5px]" : "text-[10pt]"}`}>
          Gambar 1.{pageNum}: {imgItem.caption ? imgItem.caption.replace(/#\s*\d+/g, "").trim() : `Jawaban PreTest Lembar ${pageNum}`}
        </p>
      </div>

      <div className={`text-center text-slate-400 italic ${isMini ? "text-[6px]" : "text-[9pt]"}`}>
        1 Gambar = 1 Halaman Lampiran Resmi
      </div>
    </div>
  );

  const renderLaprakPage = (isMini = false) => (
    <div
      className={`bg-white text-slate-800 ${isMini ? "p-3 text-[7.5px]" : "p-8 text-[11pt]"} flex flex-col justify-start h-full select-none space-y-2.5 overflow-hidden`}
      style={{
        fontFamily: "Calibri, Carlito, 'Segoe UI', sans-serif",
        lineHeight: "1.35",
      }}
    >
      {/* II. Hasil Praktikum BOLD */}
      <div className={`font-bold ${isMini ? "text-[9px]" : "text-sm"} text-slate-900`}>
        II. Hasil Praktikum
      </div>

      {/* A. Alat dan Bahan BOLD */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-0.5`}>
          A. Alat dan Bahan
        </div>
        <div className={`space-y-0.5 ${isMini ? "text-[7px]" : "text-xs"} text-slate-800 font-normal pl-1`}>
          {(laprakBahan || "PC / Laptop, Compiler C++ (Dev-C++ / GCC), Library standar <iostream>")
            .split(",")
            .map((b, bIdx) => (
              <div key={bIdx}>- {b.trim()}</div>
            ))}
        </div>
      </div>

      {/* B. Langkah Kerja BOLD & Pustaka Poin '-' */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-0.5`}>
          B. Langkah Kerja
        </div>
        <div className={`space-y-0.5 ${isMini ? "text-[7px]" : "text-xs"} text-slate-800 font-normal pl-1`}>
          {stepsList.map((step, sIdx) => (
            <div key={sIdx}>{step}</div>
          ))}
        </div>
      </div>

      {/* C. Implementasi Kode Program (KODE DULU SEMUA, LEBAR 11.5 CM) */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-1 flex items-center justify-between`}>
          <span>C. Implementasi Kode Program</span>
          <span className={`text-slate-500 font-normal ${isMini ? "text-[6px]" : "text-[10px]"}`}>
            (Lebar Standar 11.5 cm)
          </span>
        </div>

        <div className="space-y-1.5">
          {laprakCodes.map((codeItem) => (
            <div key={codeItem.id} className="ml-0 mr-auto" style={{ width: "94%" }}>
              <div className={`font-bold text-slate-900 mb-0.5 ${isMini ? "text-[7px]" : "text-xs"}`}>
                Tabel Kode 2.{codeItem.order}: {codeItem.title || `Program ${codeItem.order}`}
              </div>
              <div className="border border-slate-300 rounded bg-slate-50 p-1.5 font-mono text-slate-800 overflow-hidden leading-tight" style={{ fontSize: isMini ? "6px" : "10pt", fontFamily: "'Courier New', Courier, monospace" }}>
                <pre className="whitespace-pre overflow-x-hidden text-slate-900 max-h-16" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                  {codeItem.code.slice(0, isMini ? 120 : 300)}
                  {codeItem.code.length > (isMini ? 120 : 300) ? "\n..." : ""}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* D. Implementasi Screenshot (SEMUA GAMBAR MENYUSUL) */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-1`}>
          D. Implementasi Screenshot
        </div>
        {laprakImages.length > 0 ? (
          <div className="space-y-1.5 text-center">
            {laprakImages.map((img, idx) => (
              <div key={img.id} className="mx-auto">
                <img
                  src={img.url}
                  alt={`Hasil ${idx + 1}`}
                  className={`${isMini ? "max-h-14" : "max-h-36"} max-w-full object-contain mx-auto rounded border border-slate-200`}
                />
                <p className={`text-slate-600 italic font-normal mt-0.5 ${isMini ? "text-[6.5px]" : "text-[10pt]"}`}>
                  Gambar 2.{idx + 1}: {img.caption ? img.caption.replace(/#\s*\d+/g, "").trim() : `Hasil Eksekusi Program ${idx + 1}`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className={`border-2 border-dashed border-slate-200 rounded p-2 text-center text-slate-400 ${isMini ? "text-[7px]" : "text-xs"}`}>
            (Belum ada screenshot hasil program)
          </div>
        )}
      </div>

      {/* E. Analisis dan Ulasan BOLD */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-0.5`}>
          E. Analisis dan Ulasan
        </div>
        <div className={`text-justify font-normal ${isMini ? "text-[6.5px]" : "text-xs"} text-slate-800 leading-relaxed pl-1 line-clamp-3`}>
          {laprakAnalisis || "Berdasarkan pengujian praktikum, program berhasil dijalankan dengan baik dan menghasilkan keluaran yang konsisten sesuai tujuan percobaan."}
        </div>
      </div>
    </div>
  );

  const renderPosttestPage = (isMini = false) => (
    <div
      className={`bg-white text-slate-800 ${isMini ? "p-3 text-[7.5px]" : "p-8 text-[11pt]"} flex flex-col justify-start h-full select-none space-y-2.5 overflow-hidden`}
      style={{
        fontFamily: "Calibri, Carlito, 'Segoe UI', sans-serif",
        lineHeight: "1.35",
      }}
    >
      {/* III. Post Test BOLD */}
      <div className={`font-bold ${isMini ? "text-[9px]" : "text-sm"} text-slate-900`}>
        III. Post Test
      </div>

      {/* A. Tujuan Pembuatan Program BOLD */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-0.5`}>
          A. Tujuan Pembuatan Program
        </div>
        <div className={`text-justify font-normal ${isMini ? "text-[6.5px]" : "text-xs"} text-slate-800 leading-relaxed pl-1`}>
          {posttestTujuan || "Tujuan dari pembuatan program tugas mandiri / posttest ini adalah untuk memperdalam pemahaman mengenai materi praktikum yang telah dipelajari."}
        </div>
      </div>

      {/* B. Implementasi Kode Program BOLD (11.5 CM) */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-1 flex items-center justify-between`}>
          <span>B. Implementasi Kode Program</span>
          <span className={`text-slate-500 font-normal ${isMini ? "text-[6px]" : "text-[10px]"}`}>
            (Lebar Standar 11.5 cm)
          </span>
        </div>

        <div className="space-y-1.5">
          {posttestCodes.map((codeItem) => (
            <div key={codeItem.id} className="ml-0 mr-auto" style={{ width: "94%" }}>
              <div className={`font-bold text-slate-900 mb-0.5 ${isMini ? "text-[7px]" : "text-xs"}`}>
                Tabel Kode 3.{codeItem.order}: {codeItem.title || `Program Posttest ${codeItem.order}`}
              </div>
              <div className="border border-slate-300 rounded bg-slate-50 p-1.5 font-mono text-slate-800 overflow-hidden leading-tight" style={{ fontSize: isMini ? "6px" : "10pt", fontFamily: "'Courier New', Courier, monospace" }}>
                <pre className="whitespace-pre overflow-x-hidden text-slate-900 max-h-16" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                  {codeItem.code.slice(0, isMini ? 120 : 300)}
                  {codeItem.code.length > (isMini ? 120 : 300) ? "\n..." : ""}
                </pre>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* C. Implementasi Screenshot BOLD */}
      <div>
        <div className={`font-bold ${isMini ? "text-[8px]" : "text-xs"} text-slate-900 mb-1`}>
          C. Implementasi Screenshot
        </div>
        {posttestImages.length > 0 ? (
          <div className="space-y-1.5 text-center">
            {posttestImages.map((img, idx) => (
              <div key={img.id} className="mx-auto">
                <img
                  src={img.url}
                  alt={`Output ${idx + 1}`}
                  className={`${isMini ? "max-h-14" : "max-h-36"} max-w-full object-contain mx-auto rounded border border-slate-200`}
                />
                <p className={`text-slate-600 italic font-normal mt-0.5 ${isMini ? "text-[6.5px]" : "text-[10pt]"}`}>
                  Gambar 3.{idx + 1}: {img.caption ? img.caption.replace(/#\s*\d+/g, "").trim() : `Hasil Output PostTest ${idx + 1}`}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className={`border-2 border-dashed border-slate-200 rounded p-2 text-center text-slate-400 ${isMini ? "text-[7px]" : "text-xs"}`}>
            (Belum ada screenshot hasil posttest)
          </div>
        )}
      </div>
    </div>
  );

  // Build the list of all page objects for grid mapping
  const docPages = [
    { id: 1, title: "1. Cover Resmi", section: "Cover", render: () => renderCoverPage(true), renderFull: () => renderCoverPage(false) },
    { id: 2, title: "2. Pretest & Lampiran 1", section: "Pretest", render: () => renderPretestPage1(true), renderFull: () => renderPretestPage1(false) },
    ...pretestImages.slice(1).map((img, idx) => ({
      id: 3 + idx,
      title: `${3 + idx}. Lampiran Lembar ${idx + 2}`,
      section: "Lampiran",
      render: () => renderExtraLampiranPage(img, idx + 2, true),
      renderFull: () => renderExtraLampiranPage(img, idx + 2, false),
    })),
    {
      id: 3 + extraLampiranCount,
      title: `${3 + extraLampiranCount}. Hasil Praktikum (Laprak)`,
      section: "Laprak",
      render: () => renderLaprakPage(true),
      renderFull: () => renderLaprakPage(false),
    },
    {
      id: 4 + extraLampiranCount,
      title: `${4 + extraLampiranCount}. Post Test Mandiri`,
      section: "Posttest",
      render: () => renderPosttestPage(true),
      renderFull: () => renderPosttestPage(false),
    },
  ];

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl shadow-xl overflow-hidden flex flex-col transition-all">
      {/* Top Bar Preview */}
      <div className="px-4 py-3 bg-[#002b66] text-white flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <Eye className="w-4 h-4 text-amber-300 animate-pulse" />
          <div>
            <div className="text-xs font-black tracking-wide flex items-center space-x-2">
              <span>Preview Ekstraksi Halaman</span>
              <span className="bg-amber-400 text-[#002b66] text-[10px] font-black px-1.5 py-0.2 rounded shadow-xs">
                {totalDocPages} Halaman A4
              </span>
            </div>
            <p className="text-[10px] text-blue-200">
              Format persis sesuai hasil generate Word & PDF (Calibri 11pt)
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Grid (iLovePDF) vs Single Continuous */}
        <div className="flex items-center bg-[#001f4d] p-1 rounded-lg border border-blue-800 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setViewMode("grid")}
            className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 ${
              viewMode === "grid"
                ? "bg-amber-400 text-[#002b66] shadow-2xs"
                : "text-blue-200 hover:text-white"
            }`}
          >
            <span>Grid Halaman</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("sheet")}
            className={`px-2.5 py-1 rounded transition-colors flex items-center space-x-1 ${
              viewMode === "sheet"
                ? "bg-amber-400 text-[#002b66] shadow-2xs"
                : "text-blue-200 hover:text-white"
            }`}
          >
            <span>Lembar Penuh</span>
          </button>
        </div>
      </div>

      {/* Action Bar (Konfirmasi & Lanjut / Input Ulang) */}
      <div className="p-3 bg-amber-50/90 border-b border-amber-200/80 flex items-center justify-between gap-2">
        <div className="text-[11px] text-amber-950 font-medium hidden sm:block">
          Klik salah satu kartu halaman untuk memperbesar (Zoom View).
        </div>
        <div className="flex items-center space-x-2 ml-auto">
          <button
            type="button"
            onClick={onResetCurrent}
            className="px-2.5 py-1.5 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs"
            title="Dibersihkan untuk input ulang jika ada kesalahan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Input Ulang</span>
          </button>
          <button
            type="button"
            onClick={onConfirmNext}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center space-x-1.5 shadow-md shadow-emerald-600/20"
            title="Lanjut ke tahap berikutnya jika sudah sesuai"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Konfirmasi & Lanjut</span>
          </button>
        </div>
      </div>

      {/* Content Area: Grid View (iLovePDF Style) OR Continuous Sheet */}
      <div className="p-4 bg-slate-100 max-h-[620px] overflow-y-auto">
        {viewMode === "grid" ? (
          /* iLovePDF-STYLE GRID OF DOCUMENT PAGES */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {docPages.map((page) => (
              <div
                key={page.id}
                onClick={() => setZoomedPage(page.id)}
                className="group cursor-pointer flex flex-col items-center transition-all transform hover:-translate-y-1"
              >
                {/* A4 Sheet Thumbnail Container */}
                <div className="w-full aspect-[1/1.414] bg-white border-2 border-slate-300 rounded-lg shadow-md group-hover:border-[#002b66] group-hover:shadow-xl overflow-hidden relative transition-all">
                  {page.render()}

                  {/* Hover Overlay with Zoom Icon */}
                  <div className="absolute inset-0 bg-[#002b66]/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="bg-[#002b66] text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md flex items-center space-x-1">
                      <Eye className="w-3 h-3 text-amber-300" />
                      <span>Perbesar Halaman</span>
                    </span>
                  </div>
                </div>

                {/* File/Page Badge underneath thumbnail like iLovePDF */}
                <div className="mt-2 text-center w-full px-1">
                  <div className="text-[11px] font-bold text-slate-800 truncate group-hover:text-[#002b66]">
                    {page.title}
                  </div>
                  <div className="text-[10px] text-slate-500 font-medium">
                    Halaman {page.id} dari {totalDocPages}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* CONTINUOUS VIRTUAL A4 SHEET VIEW */
          <div className="space-y-6">
            {docPages.map((page) => (
              <div key={page.id} className="space-y-1.5">
                <div className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  [{page.title}]
                </div>
                <div className="bg-white border border-slate-300 shadow-md rounded-md p-6">
                  {page.renderFull()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL ZOOM VIEW (When clicking any page thumbnail) */}
      {zoomedPage !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#002b66] text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="bg-amber-400 text-[#002b66] text-xs font-black px-2 py-0.5 rounded">
                  Halaman {zoomedPage} / {totalDocPages}
                </span>
                <span className="font-bold text-sm">
                  {docPages.find((p) => p.id === zoomedPage)?.title}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setZoomedPage(null)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10"
              >
                ✕ Tutup
              </button>
            </div>

            {/* Modal Page Content */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex-1 flex justify-center">
              <div className="bg-white border border-slate-300 shadow-lg rounded max-w-xl w-full">
                {docPages.find((p) => p.id === zoomedPage)?.renderFull()}
              </div>
            </div>

            {/* Modal Footer with Previous / Next Navigation */}
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                disabled={zoomedPage <= 1}
                onClick={() => setZoomedPage((prev) => (prev ? Math.max(1, prev - 1) : 1))}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >
                ← Halaman Sebelumnya
              </button>
              <span className="text-xs font-semibold text-slate-600">
                Gunakan scroll untuk membaca seluruh isi lembar A4
              </span>
              <button
                type="button"
                disabled={zoomedPage >= totalDocPages}
                onClick={() => setZoomedPage((prev) => (prev ? Math.min(totalDocPages, prev + 1) : totalDocPages))}
                className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-40"
              >
                Halaman Berikutnya →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-medium">
        <div>
          Format baku: Font Calibri 11pt · Tabel kode 11.5 cm · 1 Gambar Pretest = 1 Page
        </div>
        <div className="font-bold text-emerald-700">
          Sesuai Template Resmi UAD
        </div>
      </div>
    </div>
  );
}

export function ReportWizard({
  praktikum,
  mingguKe,
  initialData,
  profile,
}: {
  praktikum: Praktikum;
  mingguKe: number;
  initialData: InitialData | null;
  profile?: { nama?: string; nim?: string; kelas?: string } | null;
}) {
  const [currentStep, setCurrentStep] = useState<number>(1); // 1: Pretest, 2: Laprak, 3: Posttest, 4: Finalisasi

  // Metadata Laporan
  const [materi, setMateri] = useState(
    initialData?.materi || `PRAKTIKUM ${mingguKe}: MODUL DAN IMPLEMENTASI`
  );
  const [tanggal, setTanggal] = useState(
    initialData?.tanggal || "Senin 13 April 2026 07.00-08.30"
  );
  const [tempat, setTempat] = useState(
    initialData?.tempat || praktikum.jadwal || "Laboratorium Basis Data"
  );

  // Step 1: Pretest State
  const [pretestImages, setPretestImages] = useState<OrderedImage[]>(() =>
    parseInitialImages(initialData?.imgPretest)
  );
  const [pretestQ, setPretestQ] = useState<string>(
    initialData?.pretestQ || "1. Jelaskan tujuan dari praktikum ini.\n2. Sebutkan konsep dasar yang digunakan."
  );
  const [pretestAnalyzed, setPretestAnalyzed] = useState<boolean>(!!initialData?.pretestQ);
  const [pretestApproved, setPretestApproved] = useState<boolean>(!!initialData?.pretestQ);
  const [analyzingPretest, setAnalyzingPretest] = useState(false);

  // Step 2: Laprak State
  const [laprakImages, setLaprakImages] = useState<OrderedImage[]>(() =>
    parseInitialImages(initialData?.imgLaprak)
  );
  const [laprakCodes, setLaprakCodes] = useState<OrderedCode[]>(() =>
    parseInitialCodes(
      initialData?.kodeProgram,
      `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Implementasi Praktikum Minggu ${mingguKe}" << endl;\n    return 0;\n}`,
      "Program Utama"
    )
  );
  const [laprakBahan, setLaprakBahan] = useState<string>(
    initialData?.laprakBahan
      ? (Array.isArray(JSON.parse(initialData.laprakBahan || "[]"))
          ? JSON.parse(initialData.laprakBahan || "[]").join(", ")
          : initialData.laprakBahan)
      : "PC / Laptop, Compiler C++ (Dev-C++ / GCC), Library standar <iostream>"
  );
  const [laprakLangkah, setLaprakLangkah] = useState<string>(() => {
    let raw = "";
    if (initialData?.laprakLangkah) {
      try {
        const parsed = JSON.parse(initialData.laprakLangkah);
        raw = Array.isArray(parsed) ? parsed.join("\n") : initialData.laprakLangkah;
      } catch {
        raw = initialData.laprakLangkah;
      }
    } else {
      raw = "- Menyiapkan kode program pada editor.\n- Melakukan kompilasi dan pengujian input data.\n- Mengamati output eksekusi program.";
    }
    return formatLangkahKerja(raw);
  });
  const [laprakAnalisis, setLaprakAnalisis] = useState<string>(
    initialData?.laprakAnalisis || "Berdasarkan pengujian praktikum, program berhasil dijalankan dengan baik dan menghasilkan keluaran yang konsisten sesuai tujuan percobaan."
  );
  const [laprakAnalyzed, setLaprakAnalyzed] = useState<boolean>(!!initialData?.laprakAnalisis);
  const [laprakApproved, setLaprakApproved] = useState<boolean>(!!initialData?.laprakAnalisis);
  const [analyzingLaprak, setAnalyzingLaprak] = useState(false);

  // Mode manual vs AI untuk Alat Bahan, Langkah Kerja, & Analisis
  const [bahanMode, setBahanMode] = useState<"manual" | "ai">("manual");
  const [langkahMode, setLangkahMode] = useState<"manual" | "ai">("manual");
  const [analisisMode, setAnalisisMode] = useState<"manual" | "ai">("manual");
  const [generatingBahan, setGeneratingBahan] = useState(false);
  const [generatingLangkah, setGeneratingLangkah] = useState(false);
  const [generatingAnalisis, setGeneratingAnalisis] = useState(false);

  // Step 3: Posttest State
  const [posttestImages, setPosttestImages] = useState<OrderedImage[]>(() =>
    parseInitialImages(initialData?.imgPosttest)
  );
  const [posttestCodes, setPosttestCodes] = useState<OrderedCode[]>(() =>
    parseInitialCodes(
      (initialData as any)?.kodePosttest,
      `#include <iostream>\nusing namespace std;\n\n// Kode Program Tugas Mandiri / Posttest\nint main() {\n    cout << "Tugas Posttest Minggu ${mingguKe}" << endl;\n    return 0;\n}`,
      "Program Posttest"
    )
  );
  const [posttestTujuan, setPosttestTujuan] = useState<string>(
    initialData?.posttestTujuan || "Tujuan pembuatan program posttest ini adalah untuk memperdalam pemahaman mengenai implementasi modul secara mandiri."
  );
  const [posttestAnalyzed, setPosttestAnalyzed] = useState<boolean>(!!initialData?.posttestTujuan);
  const [posttestApproved, setPosttestApproved] = useState<boolean>(!!initialData?.posttestTujuan);
  const [analyzingPosttest, setAnalyzingPosttest] = useState(false);

  // Action Handlers for Navigation & Reset
  const handleConfirmPretest = () => {
    setPretestApproved(true);
    setCurrentStep(2);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetPretest = () => {
    if (confirm("Apakah Anda yakin ingin mengulang input Pretest? Gambar dan pertanyaan akan dikosongkan.")) {
      setPretestImages([]);
      setPretestQ("");
      setPretestApproved(false);
      setPretestAnalyzed(false);
    }
  };

  const handleConfirmLaprak = () => {
    setLaprakApproved(true);
    setCurrentStep(3);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetLaprak = () => {
    if (confirm("Apakah Anda yakin ingin mengulang input Laprak? Gambar, kode, dan analisis akan direset.")) {
      setLaprakImages([]);
      setLaprakCodes([
        {
          id: `code_1_${Date.now()}`,
          order: 1,
          title: "Program Utama",
          code: `#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Implementasi Praktikum Minggu ${mingguKe}" << endl;\n    return 0;\n}`
        }
      ]);
      setLaprakBahan("PC / Laptop, Compiler C++ (Dev-C++ / GCC), Library standar <iostream>");
      setLaprakLangkah("- Menyiapkan kode program pada editor.\n- Melakukan kompilasi dan pengujian input data.\n- Mengamati output eksekusi program.");
      setLaprakAnalisis("Berdasarkan pengujian praktikum, program berhasil dijalankan dengan baik dan menghasilkan keluaran yang konsisten sesuai tujuan percobaan.");
      setLaprakApproved(false);
      setLaprakAnalyzed(false);
    }
  };

  const handleConfirmPosttest = () => {
    setPosttestApproved(true);
    setCurrentStep(4);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleResetPosttest = () => {
    if (confirm("Apakah Anda yakin ingin mengulang input Posttest? Gambar dan kode akan direset.")) {
      setPosttestImages([]);
      setPosttestCodes([
        {
          id: `code_1_${Date.now()}`,
          order: 1,
          title: "Program Posttest",
          code: `#include <iostream>\nusing namespace std;\n\n// Kode Program Tugas Mandiri / Posttest\nint main() {\n    cout << "Tugas Posttest Minggu ${mingguKe}" << endl;\n    return 0;\n}`
        }
      ]);
      setPosttestTujuan("Tujuan pembuatan program posttest ini adalah untuk memperdalam pemahaman mengenai implementasi modul secara mandiri.");
      setPosttestApproved(false);
      setPosttestAnalyzed(false);
    }
  };

  // Step 4: Finalisasi State
  const [finalFilename, setFinalFilename] = useState<string>(
    initialData?.finalFilename || `Laporan_${praktikum.nama.replace(/\s+/g, "_")}_Minggu_${mingguKe}`
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocx, setGeneratedDocx] = useState<string | null>(initialData?.docxPath || null);
  const [generatedPdf, setGeneratedPdf] = useState<string | null>(initialData?.pdfPath || null);
  const [reportId, setReportId] = useState<string | null>(initialData?.id || null);
  const [downloadingType, setDownloadingType] = useState<string | null>(null);

  // AI Analyzer: Pretest
  // AI Analyzer: Pretest
  const runPretestAI = async () => {
    setAnalyzingPretest(true);
    try {
      const primaryImage = pretestImages[0]?.url || null;
      const res = await fetch("/api/laporan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "pretest",
          materi,
          image: primaryImage
        })
      });
      const json = await res.json();
      if (json.success && json.data?.pretestQ) {
        setPretestQ(json.data.pretestQ);
      } else {
        const judul = materi ? `"${materi}"` : "praktikum ini";
        setPretestQ(
          `A. Jelaskan konsep teoritis dasar yang mendasari materi ${judul}!\nB. Sebutkan sintaks atau komponen fungsi utama dalam C++ yang digunakan dalam implementasi modul ini!\nC. Bagaimana alur logika algoritma yang diterapkan untuk menyelesaikan kasus uji pada praktikum ini?`
        );
      }
      setPretestAnalyzed(true);
    } catch (e) {
      console.error(e);
      const judul = materi ? `"${materi}"` : "praktikum ini";
      setPretestQ(
        `A. Jelaskan konsep teoritis dasar yang mendasari materi ${judul}!\nB. Sebutkan sintaks atau komponen fungsi utama dalam C++ yang digunakan dalam implementasi modul ini!\nC. Bagaimana alur logika algoritma yang diterapkan untuk menyelesaikan kasus uji pada praktikum ini?`
      );
      setPretestAnalyzed(true);
    } finally {
      setAnalyzingPretest(false);
    }
  };

  // AI Analyzer: Laprak
  const runLaprakAI = async () => {
    setAnalyzingLaprak(true);
    try {
      const primaryImage = laprakImages[0]?.url || null;
      const combinedCodes = laprakCodes
        .map((c) => `// ${c.title || "Kode"}\n${c.code}`)
        .join("\n\n");

      const res = await fetch("/api/laporan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "laprak",
          materi,
          image: primaryImage,
          kodeProgram: combinedCodes
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        if (json.data.laprakBahan) setLaprakBahan(Array.isArray(json.data.laprakBahan) ? json.data.laprakBahan.join(", ") : json.data.laprakBahan);
        if (json.data.laprakLangkah) {
          const rawSteps = Array.isArray(json.data.laprakLangkah)
            ? json.data.laprakLangkah.join("\n")
            : json.data.laprakLangkah;
          setLaprakLangkah(formatLangkahKerja(rawSteps));
        }
        if (json.data.laprakAnalisis) setLaprakAnalisis(json.data.laprakAnalisis);
      } else {
        runGenerateBahanAI();
        runGenerateLangkahAI();
        runGenerateAnalisisAI();
      }
      setLaprakAnalyzed(true);
    } catch (e) {
      console.error(e);
      runGenerateBahanAI();
      runGenerateLangkahAI();
      runGenerateAnalisisAI();
      setLaprakAnalyzed(true);
    } finally {
      setAnalyzingLaprak(false);
    }
  };

  // Dedicated AI Generator: Alat dan Bahan (Observasi Kode & Gambar)
  const runGenerateBahanAI = async () => {
    setGeneratingBahan(true);
    try {
      const primaryImage = laprakImages[0]?.url || null;
      const combinedCodes = laprakCodes
        .map((c) => `// ${c.title || "Kode"}\n${c.code}`)
        .join("\n\n");

      const res = await fetch("/api/laporan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "laprak",
          materi,
          image: primaryImage,
          kodeProgram: combinedCodes
        })
      });
      const json = await res.json();
      if (json.success && json.data?.laprakBahan && json.data.laprakBahan.length > 0) {
        setLaprakBahan(Array.isArray(json.data.laprakBahan) ? json.data.laprakBahan.join(", ") : json.data.laprakBahan);
      } else {
        // Fallback cerdas berbasis deteksi kode
        const codeText = laprakCodes.map((c) => c.code).join(" ");
        const tools = ["PC / Laptop"];
        if (codeText.includes("#include") || codeText.includes("cout") || codeText.includes("cin")) {
          tools.push("Compiler C++ (Dev-C++ / MinGW GCC)");
          if (codeText.includes("<iostream>")) tools.push("Library standar <iostream>");
          if (codeText.includes("<vector>")) tools.push("Library <vector>");
          if (codeText.includes("<iomanip>")) tools.push("Library <iomanip>");
        } else if (codeText.includes("def ") || codeText.includes("import ")) {
          tools.push("Python 3.x", "VS Code / Jupyter Notebook");
        } else {
          tools.push("Code Editor / IDE", "Compiler Standar");
        }
        setLaprakBahan(tools.join(", "));
      }
    } catch {
      setLaprakBahan("PC / Laptop, Compiler C++ (Dev-C++ / GCC), Library standar <iostream>");
    } finally {
      setGeneratingBahan(false);
    }
  };

  // Dedicated AI Generator: Langkah Kerja (Observasi Kode & Gambar)
  const runGenerateLangkahAI = async () => {
    setGeneratingLangkah(true);
    try {
      const primaryImage = laprakImages[0]?.url || null;
      const combinedCodes = laprakCodes
        .map((c) => `// ${c.title || "Kode"}\n${c.code}`)
        .join("\n\n");

      const res = await fetch("/api/laporan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "laprak",
          materi,
          image: primaryImage,
          kodeProgram: combinedCodes
        })
      });
      const json = await res.json();
      if (json.success && json.data?.laprakLangkah) {
        const rawSteps = Array.isArray(json.data.laprakLangkah)
          ? json.data.laprakLangkah.join("\n")
          : json.data.laprakLangkah;
        setLaprakLangkah(formatLangkahKerja(rawSteps));
      } else {
        const titles = laprakCodes.map((c) => c.title || "program").join(" dan ");
        setLaprakLangkah(
          formatLangkahKerja(
            `- Membuka compiler dan editor C++ pada PC / Laptop.\n- Menuliskan kode implementasi ${titles} secara terstruktur.\n- Melakukan proses kompilasi kode dan pengujian eksekusi program.\n- Mengamati keluaran hasil eksekusi program serta memastikan algoritma berjalan konsisten.`
          )
        );
      }
    } catch {
      setLaprakLangkah(
        formatLangkahKerja(
          "- Menyiapkan program C++ untuk menerima input data.\n- Melakukan kompilasi dan pengujian algoritma.\n- Mengamati dan mencatat hasil eksekusi program."
        )
      );
    } finally {
      setGeneratingLangkah(false);
    }
  };

  // Dedicated AI Generator: Analisis dan Ulasan Hasil
  const runGenerateAnalisisAI = async () => {
    setGeneratingAnalisis(true);
    try {
      const primaryImage = laprakImages[0]?.url || null;
      const combinedCodes = laprakCodes
        .map((c) => `// ${c.title || "Kode"}\n${c.code}`)
        .join("\n\n");

      const res = await fetch("/api/laporan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "laprak",
          materi,
          image: primaryImage,
          kodeProgram: combinedCodes
        })
      });
      const json = await res.json();
      if (json.success && json.data?.laprakAnalisis) {
        setLaprakAnalisis(json.data.laprakAnalisis);
      } else {
        const judul = materi ? `"${materi}"` : "praktikum ini";
        setLaprakAnalisis(
          `Berdasarkan hasil pengujian praktikum pada materi ${judul}, seluruh baris kode program berhasil dikompilasi dan dieksekusi tanpa kendala runtime. Struktur algoritma yang diterapkan mampu memproses parameter data masukan secara akurat, di mana keluaran konsol terminal telah sesuai dengan spesifikasi kasus uji yang ditentukan pada modul praktikum.`
        );
      }
    } catch {
      setLaprakAnalisis(
        "Berdasarkan hasil pelaksanaan praktikum, implementasi kode program telah berhasil dikompilasi dan dieksekusi dengan baik. Alur logika algoritma yang diterapkan mampu memproses parameter masukan secara akurat dan menghasilkan keluaran yang konsisten dengan tujuan praktikum."
      );
    } finally {
      setGeneratingAnalisis(false);
    }
  };

  // AI Analyzer: Posttest
  const runPosttestAI = async () => {
    setAnalyzingPosttest(true);
    try {
      const primaryImage = posttestImages[0]?.url || null;
      const combinedCodes = posttestCodes
        .map((c) => `// ${c.title || "Kode Posttest"}\n${c.code}`)
        .join("\n\n");

      const res = await fetch("/api/laporan/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "posttest",
          materi,
          image: primaryImage,
          kodeProgram: combinedCodes
        })
      });
      const json = await res.json();
      if (json.success && json.data?.posttestTujuan) {
        setPosttestTujuan(json.data.posttestTujuan);
      } else {
        const judul = materi ? `"${materi}"` : "praktikum";
        setPosttestTujuan(
          `Tujuan dari pembuatan program posttest pada materi ${judul} ini adalah untuk mengukur dan memvalidasi pemahaman mahasiswa secara mandiri dalam merancang algoritma terpadu tanpa instruksi bertahap. Mahasiswa diharapkan mampu menerapkan konsep teori ke dalam sintaks kode yang efisien, mengelola alur logika pemrosesan data, serta menghasilkan keluaran program yang akurat sesuai spesifikasi permasalahan yang diberikan pada soal posttest.`
        );
      }
      setPosttestAnalyzed(true);
    } catch (e) {
      console.error(e);
      const judul = materi ? `"${materi}"` : "praktikum";
      setPosttestTujuan(
        `Tujuan dari pembuatan program posttest pada materi ${judul} ini adalah untuk mengukur dan memvalidasi pemahaman mahasiswa secara mandiri dalam merancang algoritma terpadu tanpa instruksi bertahap.`
      );
      setPosttestAnalyzed(true);
    } finally {
      setAnalyzingPosttest(false);
    }
  };

  // Final Generate Laporan
  const handleFinalize = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/laporan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          praktikumId: praktikum.id,
          mingguKe,
          materi,
          tanggal,
          tempat,
          action: "FINALIZE",
          finalFilename,
          pretestData: {
            images: pretestImages,
            q: pretestQ
          },
          laprakData: {
            images: laprakImages,
            codes: laprakCodes,
            bahan: laprakBahan.split(",").map((s) => s.trim()).filter(Boolean),
            langkah: formatLangkahKerja(laprakLangkah).split("\n").filter(Boolean),
            analisis: laprakAnalisis
          },
          posttestData: {
            images: posttestImages,
            codes: posttestCodes,
            tujuan: posttestTujuan
          }
        })
      });

      const data = await res.json();
      if (data.id) {
        setReportId(data.id);
        // Polling status sampai COMPLETED
        const pollTimer = setInterval(async () => {
          try {
            const check = await fetch(`/api/laporan?praktikumId=${praktikum.id}&mingguKe=${mingguKe}`);
            const item = await check.json();
            if (item?.status === "COMPLETED") {
              setGeneratedDocx(item.docxPath);
              setGeneratedPdf(item.pdfPath);
              setIsGenerating(false);
              clearInterval(pollTimer);
            } else if (item?.status === "FAILED") {
              setIsGenerating(false);
              clearInterval(pollTimer);
            }
          } catch {}
        }, 2000);
      }
    } catch (e) {
      console.error(e);
      setIsGenerating(false);
    }
  };

  const triggerDownload = async (type: "docx" | "pdf") => {
    setDownloadingType(type);
    const rawBase = (finalFilename || `Laporan_${praktikum.nama}_Minggu_${mingguKe}`)
      .trim()
      .replace(/[\\/:*?"<>|]/g, "_")
      .replace(/\.(docx|pdf)$/i, "");
    const filename = `${rawBase}.${type}`;
    const directUrl = type === "docx" ? generatedDocx : generatedPdf;
    const url = directUrl || `/api/download/${reportId}?type=${type}&filename=${encodeURIComponent(filename)}`;
    const mimeType = type === "docx"
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";

    try {
      // 1. Coba browser File System Access API (Native Windows 'Save As' Dialog)
      if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [
              {
                description: type === "docx" ? "Microsoft Word Document (*.docx)" : "PDF Document (*.pdf)",
                accept: {
                  [mimeType]: [`.${type}`]
                }
              }
            ]
          });
          const res = await fetch(url);
          const blob = await res.blob();
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          setDownloadingType(null);
          return;
        } catch (pickerErr: any) {
          if (pickerErr.name === "AbortError") {
            setDownloadingType(null);
            return;
          }
          // Jika ditolak/tidak diizinkan oleh konteks browser, lanjut fallback
        }
      }

      // 2. Fallback: Fetch Blob & buat elemen download temporer
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
    } catch (err) {
      console.error(err);
      window.open(url, "_blank");
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/60 pb-20">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <Link
            href={`/praktikum/${praktikum.id}`}
            className="inline-flex items-center space-x-2 text-xs font-bold text-[#002b66] hover:text-amber-600 transition-colors p-2 -ml-2 rounded-lg hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Tabel Mingguan</span>
          </Link>
          <div className="flex items-center space-x-3">
            <img
              src="/uad_logo.png"
              alt="Logo UAD"
              className="w-9 h-9 object-contain drop-shadow-xs"
            />
            <div className="text-right">
              <span className="text-xs font-extrabold text-[#002b66] block">{praktikum.nama}</span>
              <span className="text-[11px] text-amber-700 font-bold">Laporan Minggu ke-{mingguKe} · UAD</span>
            </div>
          </div>
        </div>
      </header>

      {/* Stepper Progress Bar */}
      <div className="bg-white border-b border-slate-200 py-4 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between">
            {[
              { num: 1, title: "Pretest" },
              { num: 2, title: "Laprak" },
              { num: 3, title: "Posttest" },
              { num: 4, title: "Finalisasi & Unduh" }
            ].map((step, idx) => (
              <div key={step.num} className="flex items-center flex-1">
                <button
                  onClick={() => setCurrentStep(step.num)}
                  className={`flex items-center space-x-2.5 text-xs font-bold transition-colors ${
                    currentStep === step.num
                      ? "text-[#002b66]"
                      : currentStep > step.num
                      ? "text-emerald-600"
                      : "text-slate-400"
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      currentStep === step.num
                        ? "bg-[#002b66] text-amber-300 shadow-md shadow-[#002b66]/20"
                        : currentStep > step.num
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {currentStep > step.num ? <Check className="w-4 h-4" /> : step.num}
                  </span>
                  <span className="hidden sm:inline">{step.title}</span>
                </button>
                {idx < 3 && (
                  <div className="flex-1 mx-4 h-0.5 bg-slate-200 hidden sm:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Form Content */}
      <main className={`mx-auto px-4 sm:px-6 pt-8 ${currentStep <= 3 ? "max-w-7xl" : "max-w-4xl"}`}>
        {/* Identitas Sesi Praktikum */}
        <div className="paper-card p-6 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="paper-label">Materi / Topik Praktikum</label>
              <input
                type="text"
                value={materi}
                onChange={(e) => setMateri(e.target.value)}
                className="paper-input text-sm font-semibold text-slate-800"
                placeholder="Contoh: PRAKTIKUM 1: KOMPLEKSITAS ALGORITMA"
              />
            </div>
            <div>
              <label className="paper-label">Jadwal & Ruang Lab</label>
              <input
                type="text"
                value={tempat}
                onChange={(e) => setTempat(e.target.value)}
                className="paper-input text-xs"
                placeholder="Contoh: Senin 07.00 / Lab Basis Data"
              />
            </div>
          </div>
        </div>

        {currentStep <= 3 ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Sisi Kiri: Form Input Interaktif */}
            <div className="lg:col-span-7 space-y-6">
              {/* STEP 1: PRETEST */}
              {currentStep === 1 && (
                <div className="paper-card p-6 sm:p-8 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                    <div>
                      <span className="text-xs font-bold text-[#002b66] uppercase tracking-wider">Tahap 1 dari 4</span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Input & Urutan Gambar Pretest</h2>
                    </div>
                    {pretestApproved && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Pretest Terverifikasi</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Urutan Gambar Pretest */}
                    <OrderedImageSection
                      images={pretestImages}
                      onChange={(newImgs) => {
                        setPretestImages(newImgs);
                        setPretestApproved(false);
                      }}
                      label="Screenshot / Foto Lembar Pretest (Terurut)"
                      sectionPrefix="1"
                    />

                    {/* Action AI Analyze */}
                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={runPretestAI}
                        disabled={analyzingPretest}
                        className="btn-primary py-2.5 px-4 text-xs font-bold"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{analyzingPretest ? "AI Sedang Menganalisis..." : "Ekstraksi Soal Pretest via AI"}</span>
                      </button>
                      <span className="text-xs text-slate-500">
                        * AI akan membaca soal dan merapikan pertanyaan pretest secara otomatis.
                      </span>
                    </div>

                    {/* Preview Hasil Pretest */}
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="paper-label text-slate-700">Preview Pertanyaan Pretest (Hasil Ekstraksi)</label>
                      <textarea
                        rows={4}
                        value={pretestQ}
                        onChange={(e) => {
                          setPretestQ(e.target.value);
                          setPretestApproved(false);
                        }}
                        className="paper-input text-xs font-mono leading-relaxed"
                        placeholder="Pertanyaan pretest yang terbaca akan muncul di sini..."
                      />
                    </div>

                    {/* Pertanyaan Konfirmasi Interaktif */}
                    <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-[#002b66]">
                          Apakah hasil pretest ini sudah sesuai?
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Periksa pratinjau di samping kanan sebelum lanjut ke Laprak.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={handleResetPretest}
                          className="btn-secondary py-2 px-3 text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Input Ulang</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmPretest}
                          className="btn-success py-2 px-4 text-xs shadow-md shadow-emerald-600/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Konfirmasi & Lanjut</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: LAPRAK */}
              {currentStep === 2 && (
                <div className="paper-card p-6 sm:p-8 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                    <div>
                      <span className="text-xs font-bold text-[#002b66] uppercase tracking-wider">Tahap 2 dari 4</span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Input Kode Program & Urutan Gambar Laprak</h2>
                    </div>
                    {laprakApproved && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Laprak Terverifikasi</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Bagian Urutan Kode Program Laprak */}
                    <OrderedCodeSection
                      codes={laprakCodes}
                      onChange={(newCodes) => {
                        setLaprakCodes(newCodes);
                        setLaprakApproved(false);
                      }}
                      label="Kode Program Praktikum (Dapat Banyak File / Terurut)"
                      sectionPrefix="2"
                      defaultTemplate={`#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Program Praktikum Minggu ${mingguKe}" << endl;\n    return 0;\n}`}
                    />

                    {/* Bagian Urutan Gambar Screenshot Laprak */}
                    <OrderedImageSection
                      images={laprakImages}
                      onChange={(newImgs) => {
                        setLaprakImages(newImgs);
                        setLaprakApproved(false);
                      }}
                      label="Screenshot Hasil Eksekusi / Program Laprak (Terurut)"
                      sectionPrefix="2"
                    />

                    {/* Action AI Analyze Laprak */}
                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={runLaprakAI}
                        disabled={analyzingLaprak}
                        className="btn-primary py-2.5 px-4 text-xs font-bold"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{analyzingLaprak ? "AI Sedang Menganalisis..." : "Analisis Hasil & Buat Ulasan Laprak"}</span>
                      </button>
                      <span className="text-xs text-slate-500">
                        * Menghasilkan Alat & Bahan, Langkah Kerja, dan Analisis otomatis.
                      </span>
                    </div>

                    {/* Preview & Edit Hasil Laprak */}
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-5">
                      {/* 1. Alat dan Bahan dengan Pilihan Manual / Generate AI */}
                      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <label className="paper-label text-slate-800 text-xs font-bold">
                              A. Alat dan Bahan
                            </label>
                            <span className="text-[10px] text-slate-500 block">
                              Pilih mode input sendiri atau biarkan AI mengobservasi kode & gambar.
                            </span>
                          </div>

                          {/* Toggle Mode Manual vs AI */}
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setBahanMode("manual")}
                              className={`px-2.5 py-1 rounded transition-all ${
                                bahanMode === "manual"
                                  ? "bg-white text-slate-900 shadow-xs"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              Input Manual
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBahanMode("ai");
                                runGenerateBahanAI();
                              }}
                              className={`px-2.5 py-1 rounded transition-all flex items-center space-x-1 ${
                                bahanMode === "ai"
                                  ? "bg-[#002b66] text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>Generate AI</span>
                            </button>
                          </div>
                        </div>

                        {bahanMode === "ai" && (
                          <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-[#002b66]">
                            <span>
                              {generatingBahan
                                ? "AI sedang mengamati kode & gambar untuk mendeteksi alat/compiler..."
                                : "Alat & Bahan di-generate dari observasi kode program dan screenshot praktikum."}
                            </span>
                            <button
                              type="button"
                              onClick={runGenerateBahanAI}
                              disabled={generatingBahan}
                              className="btn-primary py-1 px-2.5 text-[11px] font-bold shrink-0 ml-2"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>{generatingBahan ? "Menghitung..." : "Generate Ulang"}</span>
                            </button>
                          </div>
                        )}

                        <input
                          type="text"
                          value={laprakBahan}
                          onChange={(e) => {
                            setLaprakBahan(e.target.value);
                            setLaprakApproved(false);
                          }}
                          className="paper-input text-xs"
                          placeholder="Contoh: PC / Laptop, Compiler C++ (Dev-C++ / GCC), Library <iostream>"
                        />
                        <p className="text-[10px] text-slate-500 italic">
                          * Pisahkan dengan tanda koma (,) untuk setiap alat dan bahan.
                        </p>
                      </div>

                      {/* 2. Langkah Kerja dengan Pilihan Manual / Generate AI */}
                      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <label className="paper-label text-slate-800 text-xs font-bold">
                                B. Langkah Kerja
                              </label>
                              <span className="text-[10px] text-amber-800 font-semibold bg-amber-50 px-2 py-0.2 rounded border border-amber-200">
                                Pustaka Poin: (-)
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-500 block">
                              Dapat diisi manual atau disusun otomatis oleh AI dari runtutan kode & gambar.
                            </span>
                          </div>

                          {/* Toggle Mode Manual vs AI */}
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setLangkahMode("manual")}
                              className={`px-2.5 py-1 rounded transition-all ${
                                langkahMode === "manual"
                                  ? "bg-white text-slate-900 shadow-xs"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              Input Manual
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setLangkahMode("ai");
                                runGenerateLangkahAI();
                              }}
                              className={`px-2.5 py-1 rounded transition-all flex items-center space-x-1 ${
                                langkahMode === "ai"
                                  ? "bg-[#002b66] text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>Generate AI</span>
                            </button>
                          </div>
                        </div>

                        {langkahMode === "ai" && (
                          <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-[#002b66]">
                            <span>
                              {generatingLangkah
                                ? "AI sedang menganalisis alur algoritma kode untuk menyusun langkah kerja..."
                                : "Langkah kerja metodis berhasil disarikan dari observasi logika kode program."}
                            </span>
                            <button
                              type="button"
                              onClick={runGenerateLangkahAI}
                              disabled={generatingLangkah}
                              className="btn-primary py-1 px-2.5 text-[11px] font-bold shrink-0 ml-2"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>{generatingLangkah ? "Menyusun..." : "Generate Ulang"}</span>
                            </button>
                          </div>
                        )}

                        <textarea
                          rows={4}
                          value={laprakLangkah}
                          onChange={(e) => {
                            setLaprakLangkah(e.target.value);
                            setLaprakApproved(false);
                          }}
                          onBlur={() => {
                            setLaprakLangkah((prev) => formatLangkahKerja(prev));
                          }}
                          className="paper-input text-xs font-mono leading-relaxed"
                          placeholder="- Menyiapkan kode program pada editor&#10;- Melakukan pengujian input data&#10;- Mengamati hasil keluaran program"
                        />
                        <p className="text-[11px] text-slate-500">
                          * Semua baris akan selalu diawali tanda strip (<code>-</code>) sesuai format resmi.
                        </p>
                      </div>

                      {/* 3. Analisis dan Ulasan Hasil dengan Pilihan Manual / Generate AI */}
                      <div className="p-4 rounded-lg bg-white border border-slate-200 shadow-2xs space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <label className="paper-label text-slate-800 text-xs font-bold">
                              E. Analisis dan Ulasan Hasil
                            </label>
                            <span className="text-[10px] text-slate-500 block">
                              Dapat diisi manual atau disusun otomatis oleh AI berbasis materi praktikum dan kode program.
                            </span>
                          </div>

                          {/* Toggle Mode Manual vs AI */}
                          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-300 text-xs font-bold">
                            <button
                              type="button"
                              onClick={() => setAnalisisMode("manual")}
                              className={`px-2.5 py-1 rounded transition-all ${
                                analisisMode === "manual"
                                  ? "bg-white text-slate-900 shadow-xs"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              Input Manual
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setAnalisisMode("ai");
                                runGenerateAnalisisAI();
                              }}
                              className={`px-2.5 py-1 rounded transition-all flex items-center space-x-1 ${
                                analisisMode === "ai"
                                  ? "bg-[#002b66] text-white shadow-xs"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>Generate AI</span>
                            </button>
                          </div>
                        </div>

                        {analisisMode === "ai" && (
                          <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200 rounded-lg text-xs text-[#002b66]">
                            <span>
                              {generatingAnalisis
                                ? "AI sedang menyusun analisis akademis dan ulasan hasil praktikum..."
                                : "Analisis dan ulasan ilmiah berhasil di-generate dari pengamatan materi dan kode."}
                            </span>
                            <button
                              type="button"
                              onClick={runGenerateAnalisisAI}
                              disabled={generatingAnalisis}
                              className="btn-primary py-1 px-2.5 text-[11px] font-bold shrink-0 ml-2"
                            >
                              <Sparkles className="w-3 h-3 text-amber-300" />
                              <span>{generatingAnalisis ? "Menyusun..." : "Generate Ulang"}</span>
                            </button>
                          </div>
                        )}

                        <textarea
                          rows={4}
                          value={laprakAnalisis}
                          onChange={(e) => {
                            setLaprakAnalisis(e.target.value);
                            setLaprakApproved(false);
                          }}
                          className="paper-input text-xs leading-relaxed text-justify"
                          placeholder="Analisis hasil pengujian praktikum..."
                        />
                      </div>
                    </div>

                    {/* Pertanyaan Konfirmasi Interaktif */}
                    <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-[#002b66]">
                          Apakah hasil laporan praktikum ini sudah sesuai?
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Periksa pratinjau tabel kode terpisah dan tangkapan layar di samping kanan.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={handleResetLaprak}
                          className="btn-secondary py-2 px-3 text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Input Ulang</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmLaprak}
                          className="btn-success py-2 px-4 text-xs shadow-md shadow-emerald-600/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Konfirmasi & Lanjut</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: POSTTEST */}
              {currentStep === 3 && (
                <div className="paper-card p-6 sm:p-8 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
                    <div>
                      <span className="text-xs font-bold text-[#002b66] uppercase tracking-wider">Tahap 3 dari 4</span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Input Kode Program & Urutan Gambar Posttest</h2>
                    </div>
                    {posttestApproved && (
                      <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Posttest Terverifikasi</span>
                      </span>
                    )}
                  </div>

                  <div className="space-y-6">
                    {/* Bagian Urutan Kode Program Posttest */}
                    <OrderedCodeSection
                      codes={posttestCodes}
                      onChange={(newCodes) => {
                        setPosttestCodes(newCodes);
                        setPosttestApproved(false);
                      }}
                      label="Kode Program Tugas Posttest / Mandiri (Terurut)"
                      sectionPrefix="3"
                      defaultTemplate={`#include <iostream>\nusing namespace std;\n\n// Kode Posttest Minggu ${mingguKe}\nint main() {\n    cout << "Implementasi Posttest" << endl;\n    return 0;\n}`}
                    />

                    {/* Bagian Urutan Gambar Screenshot Posttest */}
                    <OrderedImageSection
                      images={posttestImages}
                      onChange={(newImgs) => {
                        setPosttestImages(newImgs);
                        setPosttestApproved(false);
                      }}
                      label="Screenshot Output Program Posttest (Terurut)"
                      sectionPrefix="3"
                    />

                    {/* Action AI Analyze Posttest */}
                    <div className="flex items-center space-x-3 pt-2">
                      <button
                        type="button"
                        onClick={runPosttestAI}
                        disabled={analyzingPosttest}
                        className="btn-primary py-2.5 px-4 text-xs font-bold"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>{analyzingPosttest ? "AI Sedang Menganalisis..." : "Ekstraksi Tujuan Posttest via AI"}</span>
                      </button>
                      <span className="text-xs text-slate-500">
                        * Menyusun narasi tujuan pembuatan program posttest.
                      </span>
                    </div>

                    {/* Preview Hasil Posttest */}
                    <div className="p-5 rounded-xl bg-slate-50 border border-slate-200">
                      <label className="paper-label text-slate-700">Preview Tujuan & Penjelasan Posttest</label>
                      <textarea
                        rows={4}
                        value={posttestTujuan}
                        onChange={(e) => {
                          setPosttestTujuan(e.target.value);
                          setPosttestApproved(false);
                        }}
                        className="paper-input text-xs leading-relaxed"
                        placeholder="Tujuan pembuatan program posttest..."
                      />
                    </div>

                    {/* Pertanyaan Konfirmasi Interaktif */}
                    <div className="p-5 rounded-xl border border-blue-200 bg-blue-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-[#002b66]">
                          Apakah hasil posttest ini sudah sesuai?
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Periksa pratinjau di samping kanan sebelum melangkah ke tahap penamaan dan unduh dokumen.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2.5">
                        <button
                          type="button"
                          onClick={handleResetPosttest}
                          className="btn-secondary py-2 px-3 text-xs text-rose-700 hover:bg-rose-50 border-rose-200"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                          <span>Input Ulang</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleConfirmPosttest}
                          className="btn-success py-2 px-4 text-xs shadow-md shadow-emerald-600/20"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Konfirmasi & Lanjut</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Live A4 Document Preview */}
            <div className="lg:col-span-5 sticky top-22">
              <LivePreviewPanel
                currentStep={currentStep}
                praktikum={praktikum}
                mingguKe={mingguKe}
                profile={profile}
                materi={materi}
                tempat={tempat}
                tanggal={tanggal}
                pretestImages={pretestImages}
                pretestQ={pretestQ}
                laprakCodes={laprakCodes}
                laprakImages={laprakImages}
                laprakBahan={laprakBahan}
                laprakLangkah={laprakLangkah}
                laprakAnalisis={laprakAnalisis}
                posttestCodes={posttestCodes}
                posttestImages={posttestImages}
                posttestTujuan={posttestTujuan}
                onConfirmNext={
                  currentStep === 1
                    ? handleConfirmPretest
                    : currentStep === 2
                    ? handleConfirmLaprak
                    : handleConfirmPosttest
                }
                onResetCurrent={
                  currentStep === 1
                    ? handleResetPretest
                    : currentStep === 2
                    ? handleResetLaprak
                    : handleResetPosttest
                }
              />
            </div>
          </div>
        ) : (
          /* STEP 4: FINALISASI & UNDUH */
          <div className="paper-card p-6 sm:p-8 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <span className="text-xs font-bold text-[#002b66] uppercase tracking-wider">Tahap 4 dari 4</span>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">Penamaan File & Download Laporan</h2>
              </div>
              <span className="text-xs text-slate-500">Format Resmi UAD (Word & PDF)</span>
            </div>

            <div className="space-y-6">
              {/* Custom Filename */}
              <div>
                <label className="paper-label">Beri Nama File Laporan Anda</label>
                <div className="relative max-w-md">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={finalFilename}
                    onChange={(e) => setFinalFilename(e.target.value)}
                    className="paper-input pl-9 font-semibold text-slate-900"
                    placeholder="Contoh: Laporan_Stralgo_Minggu_1_Rafi"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  * Ekstensi (.docx dan .pdf) akan otomatis ditambahkan ke file yang diunduh.
                </p>
              </div>

              {/* Ringkasan Laporan Yang Siap Di-generate */}
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2.5">
                <h4 className="font-bold text-[#002b66] text-sm mb-3">Ringkasan Dokumen Berurutan:</h4>
                <div className="flex items-center space-x-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Cover Resmi: <strong>{praktikum.nama}</strong> - {materi}</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Pretest: {pretestQ ? "Pertanyaan Terisi" : "(Kosong)"} · <strong>{pretestImages.length} Lampiran Gambar Terurut</strong></span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Hasil Laprak: <strong>{laprakCodes.length} Tabel Kode Terurut</strong> · <strong>{laprakImages.length} Gambar Eksekusi Terurut</strong> · Alat Bahan, Langkah & Analisis</span>
                </div>
                <div className="flex items-center space-x-2 text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>Posttest: <strong>{posttestCodes.length} Tabel Kode Terurut</strong> · <strong>{posttestImages.length} Gambar Output Terurut</strong> · Tujuan & Penjelasan</span>
                </div>
              </div>

              {/* Tombol Generate Dokumen */}
              {!generatedDocx && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleFinalize}
                    disabled={isGenerating}
                    className="btn-primary w-full py-3.5 text-sm font-bold shadow-lg shadow-[#002b66]/20"
                  >
                    {isGenerating ? (
                      <span>Sedang Menyusun Dokumen DOCX & PDF Sesuai Urutan...</span>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generate Dokumen Laporan (Word & PDF)</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Hasil Download Setelah Generate Selesai */}
              {generatedDocx && (
                <div className="p-6 rounded-2xl bg-emerald-50 border-2 border-emerald-300 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center space-x-2.5 mb-4">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <div>
                      <h4 className="font-bold text-emerald-950 text-base">Dokumen Laporan Berhasil Dibuat!</h4>
                      <p className="text-xs text-emerald-700">
                        File telah disusun dengan semua gambar dan tabel kode tepat sesuai urutan yang Anda tentukan.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    const rawBase = (finalFilename || `Laporan_${praktikum.nama}_Minggu_${mingguKe}`)
                      .trim()
                      .replace(/[\\/:*?"<>|]/g, "_")
                      .replace(/\.(docx|pdf)$/i, "");
                    const docxDownloadName = `${rawBase}.docx`;
                    const pdfDownloadName = `${rawBase}.pdf`;

                    const docxDownloadHref = generatedDocx
                      ? generatedDocx
                      : (reportId ? `/api/download/${reportId}?type=docx&filename=${encodeURIComponent(docxDownloadName)}` : "#");
                    const pdfDownloadHref = generatedPdf
                      ? generatedPdf
                      : (reportId ? `/api/download/${reportId}?type=pdf&filename=${encodeURIComponent(pdfDownloadName)}` : "#");

                    return (
                      <div className="space-y-3 pt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Unduh Word */}
                          <button
                            type="button"
                            onClick={() => triggerDownload("docx")}
                            disabled={downloadingType !== null}
                            className="p-4 rounded-xl bg-white border border-emerald-300 hover:border-[#002b66] hover:shadow-md transition-all flex items-center justify-between group cursor-pointer text-left w-full disabled:opacity-50"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-blue-100 text-[#002b66] flex items-center justify-center font-bold">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs group-hover:text-[#002b66]">
                                  {downloadingType === "docx" ? "Menyimpan File..." : "Unduh Microsoft Word"}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">{docxDownloadName}</span>
                              </div>
                            </div>
                            <FileDown className="w-5 h-5 text-slate-400 group-hover:text-[#002b66]" />
                          </button>

                          {/* Unduh PDF */}
                          <button
                            type="button"
                            onClick={() => triggerDownload("pdf")}
                            disabled={downloadingType !== null}
                            className="p-4 rounded-xl bg-white border border-emerald-300 hover:border-rose-500 hover:shadow-md transition-all flex items-center justify-between group cursor-pointer text-left w-full disabled:opacity-50"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                                <FileDown className="w-5 h-5" />
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block text-xs group-hover:text-rose-600">
                                  {downloadingType === "pdf" ? "Menyimpan File..." : "Unduh Format PDF"}
                                </span>
                                <span className="text-[11px] text-slate-500 font-mono">{pdfDownloadName}</span>
                              </div>
                            </div>
                            <FileDown className="w-5 h-5 text-slate-400 group-hover:text-rose-600" />
                          </button>
                        </div>

                        {/* Direct View / Secondary Link */}
                        <div className="flex items-center justify-center space-x-4 pt-1 text-[11px] text-slate-500">
                          <span>Pratinjau langsung:</span>
                          <a
                            href={docxDownloadHref}
                            download={docxDownloadName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#002b66] hover:underline font-medium"
                          >
                            Download Direct DOCX
                          </a>
                          <span>·</span>
                          <a
                            href={pdfDownloadHref}
                            download={pdfDownloadName}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-rose-600 hover:underline font-medium"
                          >
                            Buka / View PDF di Tab Baru
                          </a>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-6 pt-4 border-t border-emerald-200/80 flex items-center justify-between">
                    <Link
                      href={`/praktikum/${praktikum.id}`}
                      className="text-xs font-bold text-emerald-800 hover:text-emerald-950 inline-flex items-center space-x-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Kembali ke Tabel Mingguan</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setGeneratedDocx(null);
                        setGeneratedPdf(null);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      Buat Ulang / Generate Ulang
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
