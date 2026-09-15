import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { spawn } from "child_process";
import path from "path";
import fs from "fs";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const praktikumId = searchParams.get("praktikumId");
    const mingguKe = parseInt(searchParams.get("mingguKe") || "0");

    if (!praktikumId || !mingguKe) {
      return NextResponse.json({ error: "praktikumId dan mingguKe wajib disertakan" }, { status: 400 });
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT lm.*, p.nama as praktikumNama, p.jadwal as praktikumJadwal 
       FROM LaporanMingguan lm 
       LEFT JOIN Praktikum p ON p.id = lm.praktikumId 
       WHERE lm.praktikumId = ? AND lm.mingguKe = ? LIMIT 1`,
      praktikumId,
      mingguKe
    );

    const item = rows.length > 0 ? rows[0] : null;
    return NextResponse.json(item);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      praktikumId,
      mingguKe,
      materi,
      tanggal,
      tempat,
      action, // "SAVE_DRAFT" atau "FINALIZE"
      pretestData,
      laprakData,
      posttestData,
      finalFilename
    } = body;

    if (!praktikumId || !mingguKe) {
      return NextResponse.json({ error: "praktikumId dan mingguKe wajib ada" }, { status: 400 });
    }

    // Ambil data profil mahasiswa
    const profileRows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Profile ORDER BY createdAt DESC LIMIT 1`
    );
    const profile = profileRows.length > 0 ? profileRows[0] : null;

    const praktikum = await prisma.praktikum.findUnique({
      where: { id: praktikumId }
    });

    // Data yang akan di-upsert
    const updatePayload: any = {
      materi: materi || `Praktikum Minggu ke-${mingguKe}`,
      tanggal: tanggal || new Date().toLocaleDateString("id-ID"),
      tempat: tempat || praktikum?.jadwal || "Laboratorium Komputer",
    };

    // Pretest Data
    let pretestImages: any[] = [];
    if (pretestData) {
      if (pretestData.images && Array.isArray(pretestData.images)) {
        pretestImages = pretestData.images;
        updatePayload.imgPretest = JSON.stringify(pretestImages);
      } else if (pretestData.image !== undefined) {
        updatePayload.imgPretest = pretestData.image;
        if (pretestData.image) {
          pretestImages = [{ order: 1, image: pretestData.image, caption: "" }];
        }
      }
      if (pretestData.q !== undefined) updatePayload.pretestQ = pretestData.q;
    }

    // Laprak Data
    let laprakImages: any[] = [];
    let laprakCodes: any[] = [];
    if (laprakData) {
      if (laprakData.images && Array.isArray(laprakData.images)) {
        laprakImages = laprakData.images;
        updatePayload.imgLaprak = JSON.stringify(laprakImages);
      } else if (laprakData.image !== undefined) {
        updatePayload.imgLaprak = laprakData.image;
        if (laprakData.image) {
          laprakImages = [{ order: 1, image: laprakData.image, caption: "" }];
        }
      }

      if (laprakData.codes && Array.isArray(laprakData.codes)) {
        laprakCodes = laprakData.codes;
        updatePayload.kodeProgram = JSON.stringify(laprakCodes);
      } else if (laprakData.kodeProgram !== undefined) {
        updatePayload.kodeProgram = laprakData.kodeProgram;
        if (laprakData.kodeProgram) {
          laprakCodes = [{ order: 1, title: "Program Utama", code: laprakData.kodeProgram }];
        }
      }

      if (laprakData.bahan !== undefined) updatePayload.laprakBahan = JSON.stringify(laprakData.bahan);
      if (laprakData.langkah !== undefined) updatePayload.laprakLangkah = JSON.stringify(laprakData.langkah);
      if (laprakData.analisis !== undefined) updatePayload.laprakAnalisis = laprakData.analisis;
    }

    // Posttest Data
    let posttestImages: any[] = [];
    let posttestCodes: any[] = [];
    if (posttestData) {
      if (posttestData.images && Array.isArray(posttestData.images)) {
        posttestImages = posttestData.images;
        updatePayload.imgPosttest = JSON.stringify(posttestImages);
      } else if (posttestData.image !== undefined) {
        updatePayload.imgPosttest = posttestData.image;
        if (posttestData.image) {
          posttestImages = [{ order: 1, image: posttestData.image, caption: "" }];
        }
      }

      if (posttestData.codes && Array.isArray(posttestData.codes)) {
        posttestCodes = posttestData.codes;
      } else if (posttestData.kodeProgram) {
        posttestCodes = [{ order: 1, title: "Program Posttest", code: posttestData.kodeProgram }];
      }

      if (posttestData.tujuan !== undefined) updatePayload.posttestTujuan = posttestData.tujuan;
    }

    if (finalFilename) {
      updatePayload.finalFilename = finalFilename;
    }

    if (action === "SAVE_DRAFT") {
      updatePayload.status = "DRAFT";
      const saved = await prisma.laporanMingguan.upsert({
        where: { praktikumId_mingguKe: { praktikumId, mingguKe } },
        update: updatePayload,
        create: {
          praktikumId,
          mingguKe,
          status: "DRAFT",
          ...updatePayload
        }
      });
      if (posttestCodes.length > 0) {
        await prisma.$executeRawUnsafe(
          "UPDATE LaporanMingguan SET kodePosttest = ? WHERE id = ?",
          JSON.stringify(posttestCodes),
          saved.id
        );
      }
      return NextResponse.json({ success: true, item: saved });
    }

    // Jika Action === "FINALIZE", jalankan generator.py untuk DOCX dan PDF
    updatePayload.status = "PROCESSING";
    const reportItem = await prisma.laporanMingguan.upsert({
      where: { praktikumId_mingguKe: { praktikumId, mingguKe } },
      update: updatePayload,
      create: {
        praktikumId,
        mingguKe,
        status: "PROCESSING",
        ...updatePayload
      }
    });

    if (posttestCodes.length > 0) {
      await prisma.$executeRawUnsafe(
        "UPDATE LaporanMingguan SET kodePosttest = ? WHERE id = ?",
        JSON.stringify(posttestCodes),
        reportItem.id
      );
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const jobData = {
      nama_laporan: praktikum?.nama || "Praktikum",
      materi: updatePayload.materi,
      tanggal: updatePayload.tanggal,
      tempat: updatePayload.tempat,
      nama_mahasiswa: profile?.nama || "Mahasiswa",
      nim: profile?.nim || "-",
      kelas: profile?.kelas || "-",
      pretest_q: updatePayload.pretestQ,
      images_pretest: pretestImages,
      img_pretest: pretestImages[0]?.url || pretestImages[0]?.image || updatePayload.imgPretest,
      images_laprak: laprakImages,
      img_laprak: laprakImages[0]?.url || laprakImages[0]?.image || updatePayload.imgLaprak,
      codes_laprak: laprakCodes,
      kode_program: laprakCodes[0]?.code || updatePayload.kodeProgram,
      laprak_bahan: updatePayload.laprakBahan ? (typeof updatePayload.laprakBahan === "string" ? JSON.parse(updatePayload.laprakBahan) : updatePayload.laprakBahan) : [],
      laprak_langkah: updatePayload.laprakLangkah ? (typeof updatePayload.laprakLangkah === "string" ? JSON.parse(updatePayload.laprakLangkah) : updatePayload.laprakLangkah) : [],
      laprak_analisis: updatePayload.laprakAnalisis,
      images_posttest: posttestImages,
      img_posttest: posttestImages[0]?.url || posttestImages[0]?.image || updatePayload.imgPosttest,
      codes_posttest: posttestCodes,
      kode_posttest: posttestCodes[0]?.code || "",
      posttest_tujuan: updatePayload.posttestTujuan,
      final_filename: finalFilename || `Laporan_${praktikum?.nama}_Minggu_${mingguKe}`
    };

    const jobFile = path.join(uploadDir, `job_final_${reportItem.id}.json`);
    fs.writeFileSync(jobFile, JSON.stringify(jobData), "utf-8");

    const pythonScript = path.join(process.cwd(), "generator.py");
    const python = spawn("python", [pythonScript, jobFile]);

    let stdoutData = "";
    let stderrData = "";

    python.stdout.on("data", (chunk) => { stdoutData += chunk.toString(); });
    python.stderr.on("data", (chunk) => { stderrData += chunk.toString(); });

    python.on("close", async (code) => {
      try { if (fs.existsSync(jobFile)) fs.unlinkSync(jobFile); } catch {}

      if (code === 0) {
        try {
          const lines = stdoutData.trim().split("\n");
          let resultJson: any = null;
          for (let i = lines.length - 1; i >= 0; i--) {
            try {
              const p = JSON.parse(lines[i]);
              if (p && p.docxPath) {
                resultJson = p;
                break;
              }
            } catch {}
          }

          await prisma.laporanMingguan.update({
            where: { id: reportItem.id },
            data: {
              status: "COMPLETED",
              docxPath: resultJson?.docxPath || null,
              pdfPath: resultJson?.pdfPath || null,
              finalFilename: resultJson?.filename || finalFilename
            }
          });
        } catch (e) {
          console.error("Gagal parse hasil generator:", e);
        }
      } else {
        console.error("Generator gagal code:", code, stderrData);
        await prisma.laporanMingguan.update({
          where: { id: reportItem.id },
          data: { status: "FAILED" }
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Pembuatan dokumen laporan sedang berlangsung di background.",
      id: reportItem.id
    });
  } catch (err: any) {
    console.error("API Laporan error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
