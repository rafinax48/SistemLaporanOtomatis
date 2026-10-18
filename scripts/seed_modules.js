const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const modulesData = [
  {
    nama: "Keamanan Komputer",
    totalMinggu: 11,
    jadwal: "Senin, 16:45 - 18:45 / Lab Komputasi Dasar",
    lab: "Lab Komputasi Dasar",
    materiList: [
      "Authentication",
      "Password Manajemen",
      "Kriptografi Klasik",
      "Kriptografi Modern",
      "Information Hiding",
      "Digital Signature",
      "Firewall",
      "Wireless Network Security",
      "DoS dan DDoS",
      "SQL Injection",
      "Analisa Paket Data"
    ]
  },
  {
    nama: "Pembelajaran Mendalam",
    totalMinggu: 11,
    jadwal: "Selasa, 10:45 - 12:45 / Lab Komputasi Lanjut (Sistem Cerdas)",
    lab: "Lab Komputasi Lanjut",
    materiList: [
      "Deep Neural Network (DNN)",
      "Tuning Hyperparameter",
      "Optimization",
      "Convolutional Neural Network (CNN)",
      "Transfer Learning",
      "Pengenalan Objek",
      "Generative Adversarial Network (GAN)",
      "LSTM untuk Time Series Forecasting",
      "GRU untuk Analisis Sentimen",
      "Encoder-Decoder dan Mekanisme Atensi",
      "Transformer untuk Machine Translation"
    ]
  },
  {
    nama: "Pemrograman Web Dinamis",
    totalMinggu: 9,
    jadwal: "Rabu, 08:45 - 10:45 / Lab Rekayasa Perangkat Lunak (RPL)",
    lab: "Lab Rekayasa Perangkat Lunak",
    materiList: [
      "Integrasi Database & Operasi CRUD",
      "Arsitektur RESTful API & Autentikasi",
      "Asynchronous JavaScript & Integrasi API",
      "Web Components & Shadow DOM",
      "Komparasi Arsitektur RESTful vs Event-Driven & Skalabilitas",
      "Serverless Functions & Logika Bisnis On-Demand",
      "Standarisasi Struktur Proyek",
      "CI/CD & Cloud Deployment",
      "Responsi: Proyek Akhir Praktikum"
    ]
  },
  {
    nama: "Pemprosesan Bahasa Alami",
    totalMinggu: 11,
    jadwal: "Kamis, 13:00 - 15:00 / Lab Basis Data",
    lab: "Lab Basis Data",
    materiList: [
      "Python untuk NLP & Pengolahan Dasar Teks",
      "Preprocessing (Filtering dan Tokenization)",
      "Preprocessing (Stemming dan Regular Expression)",
      "Spell Check",
      "Pembobotan / TF-IDF",
      "N-Gram dan Named Entity Recognition (NER)",
      "Parsing",
      "Text Summarization",
      "Machine Translation I",
      "Machine Translation II",
      "Flask & Responsi Implementasi Web"
    ]
  },
  {
    nama: "Teknik Multimedia",
    totalMinggu: 10,
    jadwal: "Jumat, 08:00 - 10:00 / Lab Multimedia",
    lab: "Lab Multimedia",
    materiList: [
      "Pengenalan Komponen Multimedia",
      "Pre & Post Processing Image and Video",
      "Post Processing Video (Editing Video)",
      "Pemodelan Karakter (Animasi 2D)",
      "Teknik Animasi 2D dan Action Script",
      "Pemodelan Karakter dan Pengenalan Script MEL (Maya Embedded Language)",
      "Teknik Animasi 3D (Shading, Rigging, Skinning)",
      "Augmented Reality (AR)",
      "Recording dan Editing Audio",
      "Integrasi Multimedia & Proyek Akhir"
    ]
  }
];

async function main() {
  console.log("=== MEMULAI SINKRONISASI MODUL PRAKTIKUM KE DATABASE ===");

  for (const item of modulesData) {
    let praktikum = await prisma.praktikum.findFirst({
      where: {
        nama: {
          equals: item.nama
        }
      },
      include: {
        laporan: true
      }
    });

    if (!praktikum) {
      console.log(`\n[BARU] Membuat Praktikum: "${item.nama}" (${item.totalMinggu} Minggu)`);
      praktikum = await prisma.praktikum.create({
        data: {
          nama: item.nama,
          totalMinggu: item.totalMinggu,
          jadwal: item.jadwal
        },
        include: {
          laporan: true
        }
      });
    } else {
      console.log(`\n[UPDATE] Memperbarui Praktikum: "${item.nama}" (ID: ${praktikum.id})`);
      await prisma.praktikum.update({
        where: { id: praktikum.id },
        data: {
          totalMinggu: item.totalMinggu,
          jadwal: item.jadwal
        }
      });
    }

    // Pastikan setiap minggu ada entri LaporanMingguan dengan judul materi yang tepat
    for (let m = 1; m <= item.totalMinggu; m++) {
      const materiName = item.materiList[m - 1] || `Modul ${m}`;
      const existingLaporan = praktikum.laporan?.find(l => l.mingguKe === m);

      if (!existingLaporan) {
        await prisma.laporanMingguan.create({
          data: {
            praktikumId: praktikum.id,
            mingguKe: m,
            materi: `Minggu ${m}: ${materiName}`,
            tempat: item.lab,
            status: "NOT_STARTED"
          }
        });
        console.log(`  + Dibuat Laporan Minggu ${m}: ${materiName}`);
      } else {
        // Jika materi masih berformat default dummy, perbarui ke judul materi asli
        const needsUpdate = !existingLaporan.materi || 
          existingLaporan.materi.startsWith("Minggu ") && existingLaporan.materi.includes("Materi Praktikum");
        
        if (needsUpdate || !existingLaporan.tempat) {
          await prisma.laporanMingguan.update({
            where: { id: existingLaporan.id },
            data: {
              materi: `Minggu ${m}: ${materiName}`,
              tempat: existingLaporan.tempat || item.lab
            }
          });
          console.log(`  * Diperbarui Laporan Minggu ${m}: ${materiName}`);
        } else {
          console.log(`  - Minggu ${m} sudah ada: ${existingLaporan.materi}`);
        }
      }
    }
  }

  console.log("\n=== SINKRONISASI SELESAI DENGAN SUKSES! ===");
}

main()
  .catch(err => {
    console.error("Terjadi error saat sinkronisasi:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
