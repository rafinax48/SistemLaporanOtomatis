import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "docx"; // 'docx' atau 'pdf'

    // Cek di LaporanMingguan terlebih dahulu
    const mingguan = await prisma.laporanMingguan.findUnique({
      where: { id }
    });

    let relativeFilePath: string | null = null;
    let contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    if (mingguan) {
      if (type === "pdf" && mingguan.pdfPath) {
        relativeFilePath = mingguan.pdfPath;
        contentType = "application/pdf";
      } else if (mingguan.docxPath) {
        relativeFilePath = mingguan.docxPath;
      }
    } else {
      // Fallback ke legacy Laporan model jika ada
      const legacy = await prisma.laporan.findUnique({ where: { id } });
      if (legacy && legacy.outputPath) {
        relativeFilePath = legacy.outputPath;
      }
    }

    if (!relativeFilePath) {
      return new NextResponse(`Dokumen format ${type.toUpperCase()} belum tersedia`, { status: 404 });
    }

    const fullFilePath = path.join(process.cwd(), "public", relativeFilePath.replace(/^\//, ""));
    if (!fs.existsSync(fullFilePath)) {
      return new NextResponse("File fisik tidak ditemukan pada server", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(fullFilePath);
    const customName = searchParams.get("filename");
    let filename = customName ? customName.trim() : path.basename(fullFilePath);
    // Pastikan ekstensi sesuai dengan type
    filename = filename.replace(/\.(docx|pdf)$/i, "");
    const cleanFilename = `${filename}.${type}`;
    const encodedFilename = encodeURIComponent(cleanFilename);

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="${cleanFilename}"; filename*=UTF-8''${encodedFilename}`,
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Cache-Control": "public, max-age=60",
      }
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
