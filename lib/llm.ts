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

  try {
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
  } catch (proxyErr) {
    console.warn("[Vision AI] Proxy error, attempting direct Google Gemini API call:", proxyErr);
    // Direct Google Gemini fallback
    try {
      const parts: any[] = [{ text: prompt }];
      for (const img of images) {
        let base64Data = img.data;
        if (base64Data.startsWith("data:")) {
          base64Data = base64Data.split(";base64,")[1] || base64Data;
        }
        parts.push({
          inlineData: {
            mimeType: img.mediaType || "image/png",
            data: base64Data,
          },
        });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${cfg.apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts }] }),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (raw) return raw;
      }
    } catch (directErr) {
      console.error("[Vision AI] Direct Gemini API call error:", directErr);
    }

    return JSON.stringify({
      pretest_q: "Pertanyaan Pretest (Gagal dibaca otomatis)",
      laprak_bahan: ["Perangkat Keras Komputer", "Software Praktikum"],
      laprak_langkah: ["Menyiapkan alat dan bahan", "Menjalankan modul praktikum", "Mendokumentasikan hasil"],
      laprak_tujuan: "Memahami modul praktikum yang dijalankan",
      laprak_analisis: "Hasil percobaan berjalan sesuai dengan langkah kerja.",
      laprak_ulasan: "Praktikum berjalan dengan lancar.",
      posttest_tujuan: "Mencapai pemahaman modul praktikum secara keseluruhan."
    });
  }
}
