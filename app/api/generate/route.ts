import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzeLaporan } from "@/lib/llm";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";
import { z } from "zod";

// ~27jt char base64 ≈ 20MB biner per gambar (batas frontend)
const imageField = z.string().max(27_000_000, "Gambar terlalu besar").nullable().optional();

const generateSchema = z.object({
  namaLaporan: z.string().trim().min(1, "Nama laporan wajib").max(120),
  materi: z.string().trim().min(1, "Materi wajib").max(160),
  tanggal: z.string().trim().max(120).default(""),
  tempat: z.string().trim().max(80).default(""),
  imgPretest: imageField,
  imgLaprak: imageField,
  imgPosttest: imageField,
  kodeProgram: z.string().max(20000, "Kode terlalu panjang").optional().default(""),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = generateSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({ error: "Validation Failed", details: result.error.format() }, { status: 400 });
    }
    const data = result.data;

    const laporan = await prisma.laporan.create({
      data: {
        namaLaporan: data.namaLaporan,
        materi: data.materi,
        tanggal: data.tanggal,
        tempat: data.tempat,
        imgPretest: data.imgPretest ? "attached" : null,
        imgLaprak: data.imgLaprak ? "attached" : null,
        imgPosttest: data.imgPosttest ? "attached" : null,
        kodeProgram: data.kodeProgram || "",
        status: "PROCESSING"
      }
    });

    // Background job execution
    (async () => {
      try {
        const images: { data: string; mediaType: string }[] = [];
        if (data.imgPretest) images.push({ data: data.imgPretest, mediaType: "image/png" });
        if (data.imgLaprak) images.push({ data: data.imgLaprak, mediaType: "image/png" });
        if (data.imgPosttest) images.push({ data: data.imgPosttest, mediaType: "image/png" });

        const prompt = `System: Expert Lab Assistant. 
        Topic: ${data.materi}. 
        Task: Analyze images & code. 
        Return JSON ONLY: { 
          "pretest_q": "string", 
          "laprak_bahan": ["string"], 
          "laprak_langkah": ["string"], 
          "laprak_analisis": "string", 
          "laprak_ulasan": "string", 
          "posttest_tujuan": "string" 
        }`;

        const analysisStr = await analyzeLaporan(prompt, images);
        let analysis = {};
        try {
          analysis = JSON.parse(analysisStr.replace(/```json|```/g, "").trim());
        } catch (e) { console.error("LLM JSON Error", e); }

        const jobFile = path.join(process.cwd(), "public", "uploads", `job_${laporan.id}.json`);
        if (!fs.existsSync(path.dirname(jobFile))) fs.mkdirSync(path.dirname(jobFile), { recursive: true });
        fs.writeFileSync(jobFile, JSON.stringify({ ...data, analysis, id: laporan.id }));

        const python = spawn("python", [path.join(process.cwd(), "generator.py"), jobFile]);
        
        python.on("close", async (code) => {
          if (fs.existsSync(jobFile)) fs.unlinkSync(jobFile);
          if (code === 0) {
            const outputs = fs.readdirSync(path.join(process.cwd(), "public", "outputs"));
            const match = outputs.find(f => f.includes(laporan.id));
            await prisma.laporan.update({
              where: { id: laporan.id },
              data: { status: "COMPLETED", outputPath: match ? `/outputs/${match}` : null }
            });
          } else {
            await prisma.laporan.update({ where: { id: laporan.id }, data: { status: "FAILED" } });
          }
        });
      } catch (err) {
        await prisma.laporan.update({ where: { id: laporan.id }, data: { status: "FAILED" } });
      }
    })();

    return NextResponse.json({ id: laporan.id, status: "PROCESSING" });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
