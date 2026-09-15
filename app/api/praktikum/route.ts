import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const list = await prisma.praktikum.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        laporan: {
          select: {
            id: true,
            mingguKe: true,
            status: true
          }
        }
      }
    });

    const enriched = list.map((p) => {
      const completedCount = p.laporan.filter((l) => l.status === "COMPLETED").length;
      return {
        ...p,
        completedCount,
        progressPercent: Math.round((completedCount / p.totalMinggu) * 100)
      };
    });

    return NextResponse.json(enriched);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, totalMinggu, jadwal } = body;

    if (!nama || !nama.trim()) {
      return NextResponse.json({ error: "Nama praktikum wajib diisi." }, { status: 400 });
    }

    const weeks = Math.max(1, parseInt(totalMinggu) || 10);
    const praktikum = await prisma.praktikum.create({
      data: {
        nama: nama.trim(),
        totalMinggu: weeks,
        jadwal: jadwal?.trim() || "Sesuai Jadwal Lab"
      }
    });

    // Otomatis buatkan entri laporan mingguan 1..N
    const rows = [];
    for (let i = 1; i <= weeks; i++) {
      rows.push({
        praktikumId: praktikum.id,
        mingguKe: i,
        materi: `Minggu ${i}: Modul Praktikum ${i}`,
        status: "NOT_STARTED"
      });
    }

    await prisma.laporanMingguan.createMany({
      data: rows
    });

    return NextResponse.json({ success: true, praktikum });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
