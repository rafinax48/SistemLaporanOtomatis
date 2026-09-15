import { prisma } from "@/lib/db";
import { OnboardingView } from "@/app/components/onboarding-view";
import { DashboardView } from "@/app/components/dashboard-view";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profileRows: any[] = await prisma.$queryRawUnsafe(
    `SELECT * FROM Profile ORDER BY createdAt DESC LIMIT 1`
  );
  const profile = profileRows.length > 0 ? profileRows[0] : null;

  const praktikumList = await prisma.praktikum.findMany({
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

  const enrichedPraktikum = praktikumList.map((p) => {
    const completedCount = p.laporan.filter((l) => l.status === "COMPLETED").length;
    return {
      id: p.id,
      nama: p.nama,
      totalMinggu: p.totalMinggu,
      jadwal: p.jadwal,
      completedCount,
      progressPercent: Math.round((completedCount / p.totalMinggu) * 100)
    };
  });

  // Jika belum ada profil atau belum mendaftarkan praktikum
  if (!profile || enrichedPraktikum.length === 0) {
    async function handleOnboardingComplete() {
      "use server";
      revalidatePath("/");
    }

    return <OnboardingView onComplete={handleOnboardingComplete} />;
  }

  // Jika sudah terdaftar, langsung tampilkan Dashboard Utama
  return (
    <DashboardView
      initialProfile={profile}
      initialPraktikumList={enrichedPraktikum}
    />
  );
}
