"use client";

import { Download, FileText, Clock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Laporan = {
  id: string;
  namaLaporan: string;
  materi: string;
  status: string;
  outputPath: string | null;
  createdAt: string;
};

export function HistoryList({ items }: { items: Laporan[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="lr-empty" role="status">
        <FileText size={28} strokeWidth={1.5} aria-hidden="true" />
        <p><strong>Belum ada riwayat</strong></p>
        <p>Isi form di sebelah kiri lalu tekan Generate.</p>
      </div>
    );
  }

  return (
    <div className="lr-history">
      {items.map((item) => {
        const done = item.status === "COMPLETED";
        const fail = item.status === "FAILED";
        return (
          <article key={item.id} className="lr-history-item" aria-label={`${item.namaLaporan} — ${item.status}`}>
            <div className="lr-history-main">
              <span className={`lr-dot${done ? " ok" : fail ? " fail" : " busy"}`} aria-hidden="true">
                {done ? <CheckCircle2 size={15} /> : fail ? <AlertCircle size={15} /> : <Loader2 size={15} />}
              </span>
              <div>
                <h3 className="lr-history-name">{item.namaLaporan}</h3>
                <p className="lr-history-meta">{item.materi}</p>
                <p className="lr-history-time">
                  <Clock size={11} aria-hidden="true" />
                  <time dateTime={item.createdAt}>
                    {new Date(item.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short", year: "numeric",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </time>
                  {" · "}{item.status}
                </p>
              </div>
            </div>
            {done && (
              <a href={`/api/download/${item.id}`} className="lr-dl" aria-label={`Unduh ${item.namaLaporan}`}>
                <Download size={13} aria-hidden="true" />
                DOCX
              </a>
            )}
          </article>
        );
      })}
    </div>
  );
}
