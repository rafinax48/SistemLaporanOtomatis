import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const praktikum = await prisma.praktikum.findUnique({
      where: { id },
      include: {
        laporan: {
          orderBy: { mingguKe: "asc" }
        }
      }
    });

    if (!praktikum) {
      return NextResponse.json({ error: "Praktikum tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(praktikum);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Pastikan dan cover praktikum ada di database sebelum dihapus
    const praktikum = await prisma.praktikum.findUnique({
      where: { id },
      include: {
        laporan: true
      }
    });

    if (!praktikum) {
      return NextResponse.json(
        { error: "Praktikum tidak ditemukan di database" },
        { status: 404 }
      );
    }

    // Hapus praktikum (laporan mingguan terkait otomatis terhapus via onDelete: Cascade)
    await prisma.praktikum.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: `Praktikum ${praktikum.nama} berhasil dihapus beserta seluruh laporannya.`,
      deleted: {
        id: praktikum.id,
        nama: praktikum.nama,
        totalMinggu: praktikum.totalMinggu,
        laporanCount: praktikum.laporan.length
      }
    });
  } catch (err: any) {
    console.error("Gagal menghapus praktikum:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nama, jadwal } = body;

    if (!nama || !nama.trim()) {
      return NextResponse.json(
        { error: "Nama praktikum wajib diisi dan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const praktikum = await prisma.praktikum.findUnique({ where: { id } });
    if (!praktikum) {
      return NextResponse.json(
        { error: "Praktikum tidak ditemukan di database." },
        { status: 404 }
      );
    }

    const updated = await prisma.praktikum.update({
      where: { id },
      data: {
        nama: nama.trim(),
        ...(jadwal !== undefined ? { jadwal: jadwal.trim() || "Sesuai Jadwal Lab" } : {})
      }
    });

    return NextResponse.json({
      success: true,
      message: "Data praktikum berhasil diperbarui.",
      praktikum: updated
    });
  } catch (err: any) {
    console.error("Gagal memperbarui praktikum:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
