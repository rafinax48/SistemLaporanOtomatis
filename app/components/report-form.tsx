"use client";

import { useEffect, useRef, useState } from "react";

type UploadSlot = "pretest" | "laprak" | "posttest";

const SLOTS: { key: UploadSlot; title: string; desc: string }[] = [
  { key: "pretest", title: "Pretest", desc: "Soal / jawaban pretest. OCR Vision AI, fallback input manual." },
  { key: "laprak", title: "Hasil Praktikum", desc: "Screenshot hasil + konteks alat, langkah, analisis." },
  { key: "posttest", title: "Posttest", desc: "Output posttest untuk penentuan tujuan akhir." },
];

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function ReportForm() {
  const [nama, setNama] = useState("Grafika Komputer");
  const [materi, setMateri] = useState("TRANSFORMASI OBJEK 2D");
  const [tanggal, setTanggal] = useState("Kamis 16 April 2026 10.00 – 11.30");
  const [tempat, setTempat] = useState("Jaringan");
  const [kode, setKode] = useState("");
  const [files, setFiles] = useState<Record<UploadSlot, string | null>>({
    pretest: null, laprak: null, posttest: null,
  });
  const [previews, setPreviews] = useState<Record<UploadSlot, string | null>>({
    pretest: null, laprak: null, posttest: null,
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
  }, []);

  function say(text: string, error = false) {
    setMsg(text);
    setIsError(error);
  }

  async function onPick(slot: UploadSlot, f: File | undefined) {
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { say("File terlalu besar, maks 20MB.", true); return; }
    if (!f.type.startsWith("image/")) { say("Hanya file gambar (PNG/JPG/WebP).", true); return; }
    const url = await readAsDataUrl(f);
    setFiles((p) => ({ ...p, [slot]: url }));
    setPreviews((p) => ({ ...p, [slot]: url }));
    say(`${slot} terpasang: ${f.name}`);
  }

  async function poll(id: string) {
    if (pollRef.current) window.clearInterval(pollRef.current);
    pollRef.current = window.setInterval(async () => {
      try {
        const res = await fetch("/api/reports");
        const list = await res.json();
        const item = (list as { id: string; status: string }[]).find((x) => x.id === id);
        if (!item) return;
        if (item.status === "COMPLETED") {
          say("Selesai. Dokumen siap diunduh.");
          setLoading(false);
          if (pollRef.current) window.clearInterval(pollRef.current);
          window.location.reload();
        } else if (item.status === "FAILED") {
          say("Gagal memproses laporan. Cek log server / generator.py.", true);
          setLoading(false);
          if (pollRef.current) window.clearInterval(pollRef.current);
        } else {
          say("Tahap: Vision AI membaca gambar → menyusun DOCX…");
        }
      } catch { /* keep polling */ }
    }, 2000);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!nama.trim() || !materi.trim()) { say("Nama laporan & materi wajib diisi.", true); return; }
    setLoading(true);
    say("Mengirim data ke server…");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaLaporan: nama, materi, tanggal, tempat,
          imgPretest: files.pretest, imgLaprak: files.laprak,
          imgPosttest: files.posttest, kodeProgram: kode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Gagal memproses");
      say("Tahap: Vision AI membaca gambar → menyusun DOCX…");
      poll(data.id);
    } catch (err) {
      say(`Error: ${err instanceof Error ? err.message : String(err)}`, true);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} aria-label="Form generator laporan">
      <ol className="lr-steps" aria-label="Alur pengisian">
        <li className="lr-step is-active">1 · Identitas</li>
        <li className="lr-step is-active">2 · Visual</li>
        <li className="lr-step is-active">3 · Kode</li>
        <li className="lr-step is-active">4 · Generate</li>
      </ol>

      <section className="lr-card" aria-labelledby="sec-identitas">
        <h2 className="lr-section-title" id="sec-identitas">01. Identitas Dokumen</h2>
        <p className="lr-section-sub">Judul cover kapital tiap kata 14pt · materi kapital semua 14pt · tanggal 14pt.</p>
        <div className="lr-fields two">
          <div className="lr-field">
            <label className="lr-label" htmlFor="f-nama">Nama Laporan</label>
            <input id="f-nama" className="lr-input" value={nama} onChange={(e) => setNama(e.target.value)} required maxLength={120} placeholder="Grafika Komputer" autoComplete="off" />
            <p className="lr-hint">Contoh: Grafika Komputer.</p>
          </div>
          <div className="lr-field">
            <label className="lr-label" htmlFor="f-materi">Materi Praktikum</label>
            <input id="f-materi" className="lr-input" value={materi} onChange={(e) => setMateri(e.target.value)} required maxLength={160} placeholder="TRANSFORMASI OBJEK 2D" autoComplete="off" />
            <p className="lr-hint">Ditulis kapital semua di cover.</p>
          </div>
          <div className="lr-field">
            <label className="lr-label" htmlFor="f-tanggal">Waktu Pelaksanaan</label>
            <input id="f-tanggal" className="lr-input" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required maxLength={120} placeholder="Kamis 16 April 2026 10.00 – 11.30" autoComplete="off" />
          </div>
          <div className="lr-field">
            <label className="lr-label" htmlFor="f-tempat">Lokasi / Lab</label>
            <input id="f-tempat" className="lr-input" value={tempat} onChange={(e) => setTempat(e.target.value)} required maxLength={80} placeholder="Jaringan" autoComplete="off" />
          </div>
        </div>
      </section>

      <section className="lr-card" aria-labelledby="sec-visual">
        <h2 className="lr-section-title" id="sec-visual">02. Lampiran Visual</h2>
        <p className="lr-section-sub">PNG / JPG / WebP · maks 20MB per file · dibaca Vision AI.</p>
        <div className="lr-upload">
          {SLOTS.map((s, i) => (
            <div className="lr-upload-row" key={s.key}>
              <div className="lr-upload-meta">
                <span className="lr-slot">SLOT_{String(i + 1).padStart(2, "0")}</span>
                <p className="lr-upload-title">{s.title}</p>
                <p className="lr-hint">{s.desc}</p>
              </div>
              <div className="lr-upload-side">
                {previews[s.key] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[s.key] as string} alt={`Pratinjau ${s.title}`} className="lr-thumb" />
                )}
                <label className="lr-file-label" htmlFor={`file-${s.key}`}>
                  {previews[s.key] ? "Ganti" : "Upload"}
                </label>
                <input
                  id={`file-${s.key}`}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="lr-file-input"
                  aria-label={`Upload gambar ${s.title}`}
                  onChange={(e) => onPick(s.key, e.target.files?.[0])}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="lr-card" aria-labelledby="sec-kode">
        <h2 className="lr-section-title" id="sec-kode">03. Implementasi Kode</h2>
        <p className="lr-section-sub">Opsional · masuk tabel 1×1 · Courier New 10pt di dokumen.</p>
        <div className="lr-field">
          <label className="lr-label" htmlFor="f-kode">Source Code</label>
          <textarea
            id="f-kode"
            className="lr-textarea"
            value={kode}
            onChange={(e) => setKode(e.target.value)}
            spellCheck={false}
            maxLength={20000}
            placeholder={"// Contoh\nvoid display() {\n  glPushMatrix();\n}"}
            aria-describedby="kode-hint"
          />
          <p className="lr-hint" id="kode-hint">Ditempatkan pada bagian Implementasi / Screenshot.</p>
        </div>
      </section>

      <div className="lr-actions">
        <button type="submit" disabled={loading} className="lr-btn" aria-busy={loading}>
          {loading ? "Menyusun Dokumen…" : "Generate Official Document"}
        </button>
        <div aria-live="polite" role="status">
          {msg && <p className={`lr-status${isError ? " is-error" : ""}`}>{msg}</p>}
        </div>
      </div>
    </form>
  );
}
