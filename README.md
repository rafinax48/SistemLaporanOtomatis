# Sistem Pembuatan Laporan Praktikum Otomatis

Aplikasi web modern berbasis Next.js dan Python untuk otomatisasi penyusunan Laporan Praktikum akademik sesuai format baku laboratorium universitas. Dilengkapi integrasi kecerdasan buatan **Google Gemini Vision AI** dan **Smart Heuristic Engine**.

---

## Fitur Utama

- **Cover Generator Standar**: Otomatis menghasilkan cover lengkap dengan logo institusi, identitas mahasiswa, dan format tipografi baku.
- **Tahap 1: Pretest**:
  - Pengurutan gambar lembar pretest.
  - Ekstraksi soal otomatis via **Google Gemini Vision AI** dengan penomoran abjad besar (A, B, C).
- **Tahap 2: Laporan Praktikum (Laprak)**:
  - Input kode program terurut dan screenshot output terminal.
  - **Alat & Bahan**: Mode manual atau generate AI (otomatis mendeteksi pustaka C++, compiler, dan OS).
  - **Langkah Kerja**: Mode manual atau generate AI metodis berawalan `-`.
  - **Analisis & Ulasan**: Mode manual atau generate AI dengan kajian mendalam algoritma.
- **Tahap 3: Posttest**:
  - Input kode dan tangkapan layar tugas mandiri.
  - Perumusan narasi tujuan pembelajaran praktikum otomatis via AI.
- **Tahap 4: Ekspor Dokumen**:
  - Menghasilkan file **.docx** dan **.pdf** secara instan.
  - Tabel kode program rata kiri mengikuti paragraf dengan font **Courier New 10pt**.

---

## Teknologi yang Digunakan

- **Frontend & Fullstack**: [Next.js](https://nextjs.org/) (App Router), React, TailwindCSS, Lucide Icons.
- **Database & ORM**: Prisma ORM, SQLite.
- **AI Integration**: Google Gemini 3.6 Flash Multimodal Vision API.
- **Document Engine**: Python 3 (`python-docx`), Windows COM Automation Word-to-PDF.

---

## Panduan Instalasi & Menjalankan Lokal

### 1. Prasyarat
- [Node.js](https://nodejs.org/) (v18 atau lebih baru)
- [Python](https://www.python.org/) 3.10+
- Microsoft Word (untuk konversi otomatis DOCX ke PDF via COM)

### 2. Kloning Repositori
```bash
git clone https://github.com/USERNAME/NAMA-REPO.git
cd NAMA-REPO
```

### 3. Instal Dependensi
```bash
# Instal dependensi Node.js
npm install

# Instal dependensi Python
pip install python-docx
```

### 4. Konfigurasi Lingkungan (.env)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka file `.env` dan masukkan Google Gemini API Key Anda:
```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="AIzaSy..." # Dapatkan gratis di https://aistudio.google.com
```

### 5. Setup Database
```bash
npx prisma generate
npx prisma db push
```

### 6. Jalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## Lisensi
Proyek ini dibuat untuk keperluan akademik dan perkuliahan.
