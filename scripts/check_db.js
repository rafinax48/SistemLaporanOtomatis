const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const praktikumList = await prisma.praktikum.findMany({
    include: { laporan: true }
  });
  console.log('EXISTING PRAKTIKUM IN DB:');
  for (const p of praktikumList) {
    console.log(`- ID: ${p.id} | Nama: ${p.nama} | Total: ${p.totalMinggu} | Jadwal: ${p.jadwal}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
