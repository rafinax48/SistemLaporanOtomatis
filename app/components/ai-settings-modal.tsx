"use client";

import React, { useState, useEffect } from "react";
import { Cpu, X, Sparkles, Key, Check, AlertCircle } from "lucide-react";

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (model: string) => void;
}

export function AiSettingsModal({ isOpen, onClose, onSaved }: AiSettingsModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("gemini-3.8-flash");
  const [hasCustomKey, setHasCustomKey] = useState(false);
  const [maskedKey, setMaskedKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccessMsg(null);
      fetch("/api/settings")
        .then((res) => res.json())
        .then((data) => {
          setSelectedModel(data.selectedModel || "gemini-3.8-flash");
          setHasCustomKey(Boolean(data.hasCustomKey));
          setMaskedKey(data.maskedKey || "");
          setApiKey("");
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() ? apiKey.trim() : undefined,
          selectedModel
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal menyimpan pengaturan.");
      }
      setHasCustomKey(data.hasCustomKey);
      setMaskedKey(data.maskedKey || "");
      setSuccessMsg(`Pengaturan AI berhasil diperbarui (Model: ${selectedModel}).`);
      if (onSaved) onSaved(selectedModel);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="paper-card max-w-lg w-full p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border-t-4 border-t-[#002b66]">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#002b66] to-[#0d47a1] flex items-center justify-center text-amber-300 shadow-sm">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-[#002b66] text-base">Pengaturan Model AI</h3>
              <p className="text-xs text-slate-500">Konfigurasi Google Gemini & API Key</p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Pilihan Model AI */}
          <div>
            <label className="paper-label flex items-center justify-between mb-2">
              <span>Pilihan Model AI</span>
              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
                Aktif: {selectedModel}
              </span>
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              {/* Pilihan 1: gemini-3.8-flash */}
              <label
                onClick={() => setSelectedModel("gemini-3.8-flash")}
                className={`cursor-pointer p-3 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  selectedModel === "gemini-3.8-flash"
                    ? "bg-amber-50/70 border-amber-400 ring-2 ring-amber-400/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="modalModelTier"
                  value="gemini-3.8-flash"
                  checked={selectedModel === "gemini-3.8-flash"}
                  onChange={() => setSelectedModel("gemini-3.8-flash")}
                  className="mt-0.5 text-amber-600 focus:ring-amber-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">Gemini 3.8 Flash</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                      Rekomendasi Utama
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Multimodal vision cerdas generasi terbaru, cepat, dan akurat membaca screenshot kode & terminal.
                  </p>
                </div>
              </label>

              {/* Pilihan 2: gemini-flash-latest */}
              <label
                onClick={() => setSelectedModel("gemini-flash-latest")}
                className={`cursor-pointer p-3 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  selectedModel === "gemini-flash-latest"
                    ? "bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="modalModelTier"
                  value="gemini-flash-latest"
                  checked={selectedModel === "gemini-flash-latest"}
                  onChange={() => setSelectedModel("gemini-flash-latest")}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">Gemini Flash Latest</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-100 text-blue-800">
                      Paling Stabil
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Model Flash paling stabil dengan ketersediaan tinggi dan ketahanan lonjakan trafik.
                  </p>
                </div>
              </label>

              {/* Pilihan 3: gemini-pro-latest */}
              <label
                onClick={() => setSelectedModel("gemini-pro-latest")}
                className={`cursor-pointer p-3 rounded-xl border text-left transition-all flex items-start space-x-3 ${
                  selectedModel === "gemini-pro-latest"
                    ? "bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/20 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="modalModelTier"
                  value="gemini-pro-latest"
                  checked={selectedModel === "gemini-pro-latest"}
                  onChange={() => setSelectedModel("gemini-pro-latest")}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-slate-900">Gemini Pro Latest</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-purple-100 text-purple-800">
                      Pro Tier (Penalaran Rumit)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Penalaran mendalam untuk kode kompleks, ulasan laporan komprehensif, dan analisis teknis tingkat tinggi.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Input API Key */}
          <div>
            <label className="paper-label flex items-center justify-between">
              <span className="flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-slate-500" />
                <span>Google Gemini API Key</span>
              </span>
              {hasCustomKey && (
                <span className="text-[10px] font-bold text-emerald-600 flex items-center space-x-1">
                  <Check className="w-3 h-3" />
                  <span>Key Tersimpan ({maskedKey})</span>
                </span>
              )}
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasCustomKey ? "Masukkan API Key baru jika ingin mengganti..." : "AIzaSy..."}
              className="paper-input text-xs font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Dapatkan API Key gratis tanpa kartu kredit di{" "}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[#002b66] hover:underline font-bold"
              >
                aistudio.google.com
              </a>
              . Key disimpan secara aman di database lokal Anda.
            </p>
          </div>

          {/* Tombol Aksi */}
          <div className="pt-2 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary py-2 px-3 text-xs"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary py-2 px-4 text-xs font-bold"
            >
              {isSaving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
