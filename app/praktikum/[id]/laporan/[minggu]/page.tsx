import { prisma } from "@/lib/db";
import { ReportWizard } from "@/app/components/report-wizard";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LaporanMingguanPage({
  params
}: {
  params: Promise<{ id: string; minggu: string }>;
}) {
  const { id, minggu } = await params;
  const mingguKe = parseInt(minggu);

  if (isNaN(mingguKe) || mingguKe < 1) {
    notFound();
  }

  const praktikum = await prisma.praktikum.findUnique({
    where: { id }
  });

  if (!praktikum) {
    notFound();
  }

  // Cari data laporan yang sudah ada atau buat record baru jika belum ada
  let laporan = await prisma.laporanMingguan.findUnique({
    where: {
      praktikumId_mingguKe: {
        praktikumId: id,
        mingguKe: mingguKe
      }
    }
  });

  if (!laporan) {
    laporan = await prisma.laporanMingguan.create({
      data: {
        praktikumId: id,
        mingguKe: mingguKe,
        materi: `PRAKTIKUM ${mingguKe}: MODUL DAN IMPLEMENTASI`,
        tempat: praktikum.jadwal,
        status: "NOT_STARTED"
      }
    });
  }

  // Ambil profil mahasiswa
  const profileRows = ((await prisma.$queryRawUnsafe(
    `SELECT * FROM Profile ORDER BY createdAt DESC LIMIT 1`
  ).catch(() => [])) as any[]) || [];
  const profile = profileRows.length > 0 ? profileRows[0] : null;

  return (
    <ReportWizard
      praktikum={praktikum}
      mingguKe={mingguKe}
      initialData={laporan}
      profile={profile}
    />
  );
}
