import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Profile ORDER BY createdAt DESC LIMIT 1`
    );
    const profile = rows.length > 0 ? rows[0] : null;
    return NextResponse.json(profile);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nama, nim, kelas, praktikumAwal } = body;

    if (!nama || !nim || !kelas) {
      return NextResponse.json(
        { error: "Nama, NIM, dan Kelas wajib diisi." },
        { status: 400 }
      );
    }

    // Buat / Update profil
    const profile = await prisma.profile.upsert({
      where: { nim },
      update: { nama, kelas },
      create: { nama, nim, kelas }
    });

    // Jika disertakan praktikum awal (onboarding)
    if (praktikumAwal && praktikumAwal.nama) {
      const totalMinggu = Math.max(1, parseInt(praktikumAwal.totalMinggu) || 10);
      const praktikum = await prisma.praktikum.create({
        data: {
          nama: praktikumAwal.nama,
          totalMinggu: totalMinggu,
          jadwal: praktikumAwal.jadwal || "Sesuai Jadwal Lab"
        }
      });

      // Pre-seed daftar minggu untuk praktikum ini
      const weeksData = [];
      for (let m = 1; m <= totalMinggu; m++) {
        weeksData.push({
          praktikumId: praktikum.id,
          mingguKe: m,
          materi: `Minggu ${m}: Materi Praktikum ${m}`,
          status: "NOT_STARTED"
        });
      }
      await prisma.laporanMingguan.createMany({
        data: weeksData
      });
    }

    return NextResponse.json({ success: true, profile });
  } catch (err: any) {
    console.error("Profile API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, nama, nim, kelas, foto } = body;

    if (!nama || !nim || !kelas) {
      return NextResponse.json(
        { error: "Nama, NIM, dan Kelas wajib diisi lengkap." },
        { status: 400 }
      );
    }

    let targetId = id;
    if (!targetId) {
      const existing = await prisma.profile.findFirst({
        orderBy: { createdAt: "desc" }
      });
      targetId = existing?.id;
    }

    if (targetId) {
      if (foto !== undefined) {
        await prisma.$executeRawUnsafe(
          `UPDATE Profile SET nama = ?, nim = ?, kelas = ?, foto = ? WHERE id = ?`,
          nama.trim(),
          nim.trim(),
          kelas.trim(),
          foto,
          targetId
        );
      } else {
        await prisma.$executeRawUnsafe(
          `UPDATE Profile SET nama = ?, nim = ?, kelas = ? WHERE id = ?`,
          nama.trim(),
          nim.trim(),
          kelas.trim(),
          targetId
        );
      }
    } else {
      const newId = "prof_" + Date.now();
      await prisma.$executeRawUnsafe(
        `INSERT INTO Profile (id, nama, nim, kelas, foto, createdAt) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        newId,
        nama.trim(),
        nim.trim(),
        kelas.trim(),
        foto || null
      );
      targetId = newId;
    }

    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT * FROM Profile WHERE id = ? LIMIT 1`,
      targetId
    );
    const updatedProfile = rows.length > 0 ? rows[0] : null;

    return NextResponse.json({
      success: true,
      message: "Profil mahasiswa berhasil diperbarui.",
      profile: updatedProfile
    });
  } catch (err: any) {
    console.error("Gagal memperbarui profil:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
