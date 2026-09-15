import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { getLLMConfig } from "@/lib/env";

export async function analyzeLaporan(
  prompt: string,
  images: { data: string; mediaType: string }[]
): Promise<string> {
  const cfg = getLLMConfig();
  if (!cfg.apiKey) {
    console.warn("[Vision AI] Key tidak ditemukan, fallback ke analisis default.");
    return JSON.stringify({
      pretest_q: "Pertanyaan Pretest (Gagal dibaca, silakan input manual)",
      laprak_bahan: ["PC", "Software Praktikum"],
      laprak_langkah: ["Menyiapkan alat dan bahan", "Menjalankan modul praktikum"],
      laprak_tujuan: "Memahami modul praktikum yang dijalankan",
      laprak_analisis: "Hasil percobaan berjalan sesuai dengan langkah kerja.",
      laprak_ulasan: "Praktikum berjalan dengan lancar.",
      posttest_tujuan: "Mencapai pemahaman modul praktikum secara keseluruhan."
    });
  }

  const provider = createOpenAI({
    apiKey: cfg.apiKey,
    baseURL: cfg.baseURL,
  });

  const { text } = await generateText({
    model: provider.chat(cfg.modelId),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...images.map((img) => ({
            type: "image" as const,
            image: img.data,
            mediaType: img.mediaType,
          })),
        ],
      },
    ],
  });

  return text;
}
