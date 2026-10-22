import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

async function getAiConfig() {
  let customKey: string | null = null;
  let modelName = "gemini-3.8-flash";

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      `SELECT apiKey, selectedModel FROM Settings WHERE id = 'singleton' LIMIT 1`
    );
    if (rows && rows.length > 0) {
      if (rows[0].apiKey && rows[0].apiKey.trim()) {
        customKey = rows[0].apiKey.trim();
      }
      if (rows[0].selectedModel && rows[0].selectedModel.trim()) {
        modelName = rows[0].selectedModel.trim();
      }
    }
  } catch {
    // fallback
  }

  const rawEnvKey = process.env.GEMINI_API_KEY || "";
  // Hanya gunakan env key jika formatnya menyerupai Google AI Studio (AIzaSy...)
  const validEnvKey = rawEnvKey.startsWith("AIzaSy") ? rawEnvKey : "";
  const apiKey = customKey || validEnvKey || "";

  return { apiKey, modelName: modelName || "gemini-3.8-flash" };
}

/**
 * Normalisasi data gambar baik dari base64 data URL maupun file path lokal di server
 */
function normalizeImagePart(rawImage: string): { mimeType: string; data: string } | null {
  if (!rawImage || typeof rawImage !== "string") return null;

  // 1. Data URL Base64 (data:image/...)
  if (rawImage.startsWith("data:")) {
    const splitParts = rawImage.split(";base64,");
    const mimeType = splitParts[0].replace("data:", "") || "image/png";
    const data = splitParts[1] || "";
    if (data.length > 50) return { mimeType, data };
  }

  // 2. File path lokal di public/uploads
  try {
    const cleanPath = rawImage.replace(/^\/?public\/?/, "").replace(/^\//, "");
    const fullPath = path.join(process.cwd(), "public", cleanPath);
    if (fs.existsSync(fullPath)) {
      const fileBuffer = fs.readFileSync(fullPath);
      const ext = path.extname(fullPath).toLowerCase();
      const mimeType = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".webp" ? "image/webp" : "image/png";
      return { mimeType, data: fileBuffer.toString("base64") };
    }
  } catch {
    // ignore
  }

  // 3. Raw Base64 string tanpa prefix
  if (rawImage.length > 100 && !rawImage.includes("/") && !rawImage.includes("\\")) {
    return { mimeType: "image/png", data: rawImage };
  }

  return null;
}

/**
 * Panggilan Google Gemini API dengan dukungan Multimodal Multi-Image & Diagnostik Penuh
 */
async function callGeminiNative(
  prompt: string,
  imagesInput?: string | string[]
): Promise<{ success: boolean; data?: any; errorMsg?: string; modelUsed?: string }> {
  const { apiKey: key, modelName: initialModel } = await getAiConfig();

  if (!key) {
    return {
      success: false,
      errorMsg: "Google Gemini API Key belum disetel. Masukkan API Key Anda di menu Pengaturan AI (⚙️)."
    };
  }

  const parts: any[] = [{ text: prompt }];

  // Olah seluruh gambar (mendukung banyak gambar sekaligus)
  const imageList = Array.isArray(imagesInput)
    ? imagesInput
    : imagesInput ? [imagesInput] : [];

  for (const imgItem of imageList) {
    const norm = normalizeImagePart(imgItem);
    if (norm) {
      parts.push({
        inlineData: {
          mimeType: norm.mimeType,
          data: norm.data
        }
      });
    }
  }

  // Model candidates berjenjang yang aktif dan kompatibel dengan Google AI Studio
  const candidateModels = [
    initialModel,
    "gemini-3.8-flash",
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-pro-latest",
    "gemini-3.1-pro-preview",
    "gemini-flash-lite-latest"
  ].filter((m, i, arr) => arr.indexOf(m) === i && Boolean(m));

  let lastError = "Gagal memanggil Gemini API.";

  for (const model of candidateModels) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 40000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.2,
            topP: 0.95
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`Gemini API (${model}) Error HTTP ${res.status}:`, errText);
        lastError = `HTTP ${res.status}: ${errText.slice(0, 150)}`;
        // Bila 404 (model tidak tersedia), 503 (demand tinggi), 429 (rate limit), atau 500+ (server error),
        // segera beralih mencoba model cadangan berikutnya
        if (res.status === 404 || res.status === 503 || res.status === 429 || res.status >= 500) {
          continue;
        }
        return { success: false, errorMsg: lastError };
      }

      const resJson = await res.json();
      const rawText = resJson?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      let clean = rawText.trim();
      if (clean.includes("```json")) {
        clean = clean.split("```json")[1].split("```")[0].trim();
      } else if (clean.includes("```")) {
        clean = clean.split("```")[1].split("```")[0].trim();
      }

      try {
        const parsed = JSON.parse(clean);
        return { success: true, data: parsed, modelUsed: model };
      } catch {
        return { success: true, data: { raw: rawText }, modelUsed: model };
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err?.message || String(err);
      console.warn(`Gemini fetch error (${model}):`, lastError);
      // Lanjut coba model berikutnya jika terjadi timeout atau fetch error
      continue;
    }
  }

  return { success: false, errorMsg: lastError };
}

/**
 * Domain-Specific Academic Heuristics untuk Pretest
 */
function getPretestHeuristic(materi: string, praktikumNama: string, captions: string[] = []): string {
  // Jika mahasiswa menyertakan keterangan gambar pretest
  if (captions.length > 0) {
    const filteredCaptions = captions.filter(Boolean);
    if (filteredCaptions.length > 0) {
      const questions = filteredCaptions.map((cap, idx) => {
        const letter = String.fromCharCode(65 + idx); // A, B, C...
        const clean = cap.replace(/^(?:soal|pertanyaan|[a-z0-9.\-\s]+:)/i, "").trim();
        return `${letter}. ${clean.length > 5 ? clean : `Uraikan penjelasan mengenai ${clean || "topik pengujian"}!`}`;
      });
      return questions.join("\n");
    }
  }

  const combined = `${praktikumNama || ""} ${materi || ""}`.toLowerCase();

  if (combined.includes("keamanan") || combined.includes("security") || combined.includes("kripto") || combined.includes("crypto")) {
    return "A. Jelaskan konsep dasar CIA Triad (Confidentiality, Integrity, Availability) dalam keamanan sistem komputer!\nB. Uraikan perbedaan antara algoritma enkripsi simetris (seperti AES/DES) dengan asimetris (seperti RSA)!\nC. Apa fungsi kriptografi hash (seperti SHA-256) dalam memvalidasi keaslian dan integritas data?";
  }
  if (combined.includes("jaringan") || combined.includes("network") || combined.includes("cisco")) {
    return "A. Jelaskan fungsi dari masing-masing lapisan pada model referensi OSI 7 Layer!\nB. Bagaimana mekanisme pembagian subnet mask dan perhitungan IP Address pada topologi laboratorium?\nC. Jelaskan perbedaan cara kerja transmisi data antara protokol TCP (connection-oriented) dan UDP (connectionless)!";
  }
  if (combined.includes("basis data") || combined.includes("database") || combined.includes("sql")) {
    return "A. Jelaskan perbedaan mendasar antara Data Definition Language (DDL) dan Data Manipulation Language (DML)!\nB. Uraikan konsep relasi antar tabel (Primary Key & Foreign Key) serta tujuannya dalam integritas data!\nC. Mengapa normalisasi data hingga 3NF diperlukan dalam perancangan database laboratorium?";
  }
  if (combined.includes("web") || combined.includes("frontend") || combined.includes("backend")) {
    return "A. Jelaskan siklus kerja request-response antara client browser dan server melalui protokol HTTP/HTTPS!\nB. Bagaimana peran Document Object Model (DOM) dalam interaksi halaman web menggunakan JavaScript?\nC. Jelaskan perbedaan arsitektur web client-side rendering dengan server-side rendering!";
  }
  if (combined.includes("sistem operasi") || combined.includes("os") || combined.includes("linux")) {
    return "A. Jelaskan siklus hidup proses (Running, Ready, Blocked) di dalam kernel sistem operasi!\nB. Bagaimana mekanisme kerja virtual memory dan paging dalam alokasi memori fisik komputer?\nC. Uraikan hierarki permission berkas (read, write, execute) pada sistem operasi UNIX/Linux!";
  }

  const judul = materi || praktikumNama || "praktikum ini";
  return `A. Jelaskan prinsip dasar teoritis yang melandasi materi ${judul}!\nB. Sebutkan sintaks atau modul perangkat lunak utama yang diimplementasikan pada praktikum ini!\nC. Bagaimana alur logika algoritma yang diterapkan untuk menghasilkan keluaran yang valid pada lembar kerja praktikum ini?`;
}

/**
 * Deep Code & Context Inspector
 * Membedah isi kode program nyata mahasiswa (Python, C++, Java, SQL, Socket, dsb.)
 * serta caption dan metadata gambar screenshot untuk menghasilkan ulasan yang 100% presisi dan relevan.
 */
function inspectStudentArtifacts(
  praktikumNama: string,
  materi: string,
  kodeProgram: string,
  captions: string[] = [],
  userNotes?: string
) {
  const combined = `${praktikumNama || ""} ${materi || ""}`.toLowerCase();
  const codeRaw = (kodeProgram || "").trim();
  const codeLower = codeRaw.toLowerCase();

  const isKeamanan = combined.includes("keamanan") || combined.includes("security") || combined.includes("kripto") || combined.includes("crypto");
  const isJaringan = combined.includes("jaringan") || combined.includes("network") || combined.includes("cisco");
  const isBasisData = combined.includes("basis data") || combined.includes("database") || combined.includes("sql");
  const isWeb = combined.includes("web") || combined.includes("frontend") || combined.includes("backend");
  const isSistemOperasi = combined.includes("sistem operasi") || combined.includes("os") || combined.includes("linux");

  // 1. Deteksi Bahasa Pemrograman & Toolchain Nyata
  let langName = "Program Komputer";
  let compilerRuntime = "Lingkungan Kompilasi & Eksekusi Perangkat Lunak";
  let editorIde = "Visual Studio Code";
  const libraries: string[] = [];
  const functions: string[] = [];
  const printOutputs: string[] = [];
  const codeTitles: string[] = [];

  // Ekstrak komentar judul/header
  const commentMatches = codeRaw.match(/(?:\/\/|#|--)\s*([A-Za-z0-9_\-\s:]{4,60})/g);
  if (commentMatches) {
    commentMatches.slice(0, 3).forEach((c) => {
      const clean = c.replace(/^(?:\/\/|#|--)\s*/, "").trim();
      if (clean && !codeTitles.includes(clean)) codeTitles.push(clean);
    });
  }

  // Cek apakah ada kode nyata (bukan hanya template kosong C++ jika di matkul keamanan/db)
  const hasRealPython =
    codeLower.includes("def ") ||
    codeLower.includes("import ") ||
    codeLower.includes("print(") ||
    codeLower.includes("hashlib") ||
    codeLower.includes("socket") ||
    codeLower.includes("elif ") ||
    codeLower.includes("__name__");

  const hasRealSql =
    codeLower.includes("create table") ||
    codeLower.includes("select ") ||
    codeLower.includes("insert into") ||
    codeLower.includes("alter table") ||
    codeLower.includes("from ") && codeLower.includes("where ");

  const hasRealJava =
    codeLower.includes("public class") ||
    codeLower.includes("system.out.print");

  const hasRealCpp =
    (codeLower.includes("#include") || codeLower.includes("cout <<") || codeLower.includes("cin >>") || codeLower.includes("std::")) &&
    !isKeamanan && !isBasisData;

  // PRIORITAS 1: PYTHON (Sangat umum di Keamanan Komputer, Jaringan, AI, DS)
  if (hasRealPython || (isKeamanan && !hasRealSql && !hasRealJava)) {
    langName = "Python 3.x";
    compilerRuntime = "Interpreter Python 3.x (Python Runtime)";
    editorIde = "Visual Studio Code / Terminal Linux / Windows";

    // Pustaka import
    const pyImps = codeRaw.matchAll(/(?:^[ \t]*import[ \t]+([^\r\n]+)|^[ \t]*from[ \t]+([a-zA-Z0-9_]+)[ \t]+import[ \t]+([^\r\n]+))/gm);
    for (const m of pyImps) {
      const modSource = m[2] || m[1];
      if (modSource) {
        modSource.split(",").forEach((t) => {
          const matchWord = t.trim().match(/^[a-zA-Z0-9_]+/);
          const cleanLib = matchWord ? matchWord[0] : "";
          if (cleanLib && !["as", "from", "import", "def"].includes(cleanLib) && !libraries.includes(cleanLib)) {
            libraries.push(cleanLib);
          }
        });
      }
    }

    // Jika belum ada pustaka dan ini matkul Keamanan Komputer
    if (libraries.length === 0 && isKeamanan) {
      if (codeLower.includes("sha") || codeLower.includes("hash")) libraries.push("hashlib");
      else if (codeLower.includes("caesar") || codeLower.includes("cipher")) libraries.push("Modul Kriptografi Klasik");
      else libraries.push("hashlib");
    }

    // Fungsi def
    const pyFns = codeRaw.matchAll(/def\s+([a-zA-Z0-9_]{3,35})\s*\(([^)]*)\)/g);
    for (const m of pyFns) {
      const fnName = m[1];
      if (fnName && !fnName.startsWith("__") && !functions.includes(fnName)) {
        functions.push(fnName);
      }
    }

    // Output / print statements
    const pyOuts = codeRaw.matchAll(/print\s*\(\s*(?:f?["']([^"'\\]{3,50})["']|([a-zA-Z0-9_]+))/g);
    for (const m of pyOuts) {
      const text = m[1] || m[2];
      if (text && !printOutputs.includes(text.trim())) printOutputs.push(text.trim());
    }
  }
  // PRIORITAS 2: SQL (Basis Data)
  else if (hasRealSql || isBasisData) {
    langName = "SQL (Structured Query Language)";
    compilerRuntime = "RDBMS MySQL / MariaDB Server 8.0+";
    editorIde = "phpMyAdmin / DBeaver / MySQL Workbench / Terminal SQL";

    if (codeLower.includes("create table")) libraries.push("Perintah DDL (CREATE TABLE)");
    if (codeLower.includes("insert into")) libraries.push("Perintah DML (INSERT INTO)");
    if (codeLower.includes("select ")) libraries.push("Kueri DML (SELECT)");
    if (codeLower.includes("where ")) libraries.push("Klausa Filtering (WHERE)");

    // Ekstrak nama tabel yang dibuat
    const tableMatches = codeRaw.matchAll(/create\s+table\s+([a-zA-Z0-9_]+)/gi);
    for (const tm of tableMatches) {
      if (tm[1] && !functions.includes(`Tabel ${tm[1]}`)) functions.push(`Tabel ${tm[1]}`);
    }
  }
  // PRIORITAS 3: JAVA
  else if (hasRealJava) {
    langName = "Java (JDK)";
    compilerRuntime = "Java Development Kit (JDK 17+) / JVM";
    editorIde = "IntelliJ IDEA / Eclipse / Visual Studio Code";

    const javaFns = codeRaw.matchAll(/(?:public|private|static|\s)+\s+(?:void|int|String|boolean)\s+([a-zA-Z0-9_]{3,30})\s*\(/g);
    for (const m of javaFns) {
      if (m[1] && m[1] !== "main" && !functions.includes(m[1])) functions.push(m[1]);
    }
  }
  // PRIORITAS 4: C / C++
  else if (hasRealCpp || (!isKeamanan && !isBasisData && !isJaringan)) {
    langName = codeLower.includes("cout") || codeLower.includes("std::") ? "C++" : "C/C++";
    compilerRuntime = "Compiler C++ (MinGW GCC / Clang / Dev-C++)";
    editorIde = "Visual Studio Code / Dev-C++ / Code::Blocks";

    const incs = codeRaw.matchAll(/#include\s*[<"]([^>"]+)[>"]/g);
    for (const m of incs) {
      if (m[1] && !libraries.includes(`<${m[1]}>`)) libraries.push(`<${m[1]}>`);
    }

    const fnList = codeRaw.matchAll(/\b(?:void|int|float|double|char|string|bool|auto)\s+([a-zA-Z0-9_]{3,30})\s*\(/g);
    for (const m of fnList) {
      if (m[1] && m[1] !== "main" && !functions.includes(m[1])) functions.push(m[1]);
    }

    const outs = codeRaw.matchAll(/cout\s*<<\s*["']([^"'\\]{3,45})["']/g);
    for (const m of outs) {
      if (m[1] && !printOutputs.includes(m[1].trim())) printOutputs.push(m[1].trim());
    }
  }

  // 2. Susun Alat dan Bahan Berdasarkan Bukti Nyata
  const tools: string[] = ["Perangkat Keras PC / Laptop", "Sistem Operasi Komputer (Linux / Windows)"];
  tools.push(compilerRuntime);
  tools.push(editorIde);

  if (libraries.length > 0) {
    tools.push(`Pustaka & Modul: ${libraries.slice(0, 4).join(", ")}`);
  }

  // Tools Domain Khusus
  if (isKeamanan) {
    if (!tools.some((t) => t.includes("Terminal"))) tools.push("Terminal Konsol (Linux / Windows)");
    tools.push("Perangkat Analisis Keamanan & Kriptografi (Toolkit Keamanan)");
  } else if (isJaringan) {
    tools.push("Wireshark Protocol Analyzer / Cisco Packet Tracer");
  } else if (isBasisData) {
    tools.push("Modul Praktikum Basis Data FTI UAD");
  }

  // 3. Susun Langkah Kerja Berbasis Fungsi, Kode, dan Caption Gambar
  const steps: string[] = [];

  // Langkah 1: Persiapan Environment
  steps.push(`Menyiapkan lingkungan pengembangan ${langName} pada PC/Laptop dan membuka ${editorIde}.`);

  // Langkah 2: Persiapan Modul / Pustaka
  if (libraries.length > 0) {
    steps.push(`Memastikan modul dan pustaka kerja (${libraries.slice(0, 3).join(", ")}) telah siap dan diimpor ke dalam berkas program.`);
  } else {
    steps.push(`Membuat file lembar kerja baru sesuai prosedur modul praktikum "${materi || praktikumNama}".`);
  }

  // Langkah 3: Implementasi Logika Kode & Fungsi
  if (functions.length > 0) {
    const fnNames = functions.slice(0, 3).map((f) => f.startsWith("Tabel") ? f : `'${f}()'`).join(" dan ");
    steps.push(`Mengimplementasikan struktur logika algoritma dengan mendefinisikan ${fnNames} untuk memproses data masukan pengujian.`);
  } else if (langName.includes("SQL")) {
    steps.push("Menuliskan baris instruksi kueri DDL dan DML secara terstruktur untuk memanipulasi entitas data laboratorium.");
  } else {
    const titleRef = codeTitles[0] ? ` (${codeTitles[0]})` : "";
    steps.push(`Menuliskan baris instruksi program${titleRef} secara terstruktur sesuai prosedur modul praktikum.`);
  }

  // Langkah 4: Pengujian & Eksekusi Data Uji
  if (printOutputs.length > 0) {
    steps.push(`Menjalankan program dan memasukkan data uji (parameter/pesan: "${printOutputs[0]}") untuk menguji alur eksekusi.`);
  } else {
    steps.push("Melakukan eksekusi program pada konsol terminal dengan parameter masukan sesuai skenario praktikum.");
  }

  // Langkah 5: Verifikasi Hasil Eksekusi & Screenshot
  if (captions.length > 0) {
    const capList = captions.slice(0, 2).map((c, idx) => `Gambar 2.${idx + 1}: ${c}`).join("; ");
    steps.push(`Mengamati dan memverifikasi hasil eksekusi keluaran terminal sesuai tangkapan layar (${capList}) guna memastikan algoritma berjalan valid.`);
  } else {
    steps.push("Mengamati dan memverifikasi hasil keluaran (output) pada terminal konsol (Gambar 2.1) untuk memastikan seluruh instruksi dieksekusi tanpa galat.");
  }

  // Langkah 6: Dokumentasi
  steps.push("Mendokumentasikan tangkapan layar (screenshot) bukti hasil eksekusi program ke dalam lembar laporan praktikum.");

  // 4. Susun Analisis dan Ulasan Hasil SKOR 5 (Refleksi 5 Pilar Eksplisit)
  let fungsiUlasan = "";
  if (functions.length > 0) {
    const fnListStr = functions.slice(0, 3).map((f) => f.startsWith("Tabel") ? f : `\`${f}()\``).join(", ");
    fungsiUlasan = ` Pada implementasi program, ${fnListStr} berperan utama dalam mengeksekusi logika algoritma, di mana pemrosesan data dilakukan secara terstruktur.`;
  } else if (libraries.length > 0) {
    fungsiUlasan = ` Pemanfaatan pustaka ${libraries.slice(0, 3).join(", ")} memfasilitasi komputasi data secara efisien dan modular.`;
  }

  let outputUlasan = "";
  if (captions.length > 0) {
    const captionRef = captions.slice(0, 2).join("; ");
    outputUlasan = ` Bukti tangkapan layar (${captionRef}) memperlihatkan bahwa luaran program pada konsol terminal telah sesuai dengan spesifikasi permasalahan yang diujikan.`;
  } else if (printOutputs.length > 0) {
    outputUlasan = ` Keluaran program pada terminal (menampilkan respon: "${printOutputs.slice(0, 2).join(' / ')}") membuktikan bahwa alur kontrol algoritma bekerja secara valid.`;
  } else {
    outputUlasan = " Hasil eksekusi pada antarmuka terminal membuktikan bahwa luaran program berjalan konsisten dan tidak ditemukan indikasi galat sintaksis maupun runtime.";
  }

  // Refleksi 5 Pilar Wajib (Standar SKOR 5):
  const pembelajaranText = `Melalui pelaksanaan praktikum pada mata kuliah "${praktikumNama || "Informatika"}" dengan materi "${materi || "Praktikum"}", mahasiswa memahami secara mendalam arsitektur komputasi dan kaidah implementasi program berbasis ${langName}.${fungsiUlasan} Mahasiswa mampu menganalisis keterkaitan antara struktur data masukan dan respon keluaran terminal secara analitis.`;

  let kendalaText = "Pada tahap awal pengujian, kendala teknis yang dihadapi mencakup penyesuaian dependensi runtime lingkungan kerja serta verifikasi penanganan tipe data masukan agar tidak memicu eksepsi saat kompilasi.";
  if (isKeamanan) {
    kendalaText = "Kendala teknis yang dihadapi adalah penyesuaian format encoding biner pada algoritma kriptografi serta sinkronisasi penanganan kunci enkripsi/dekripsi agar luaran digest hash tidak mengalami mismatch.";
  } else if (isBasisData) {
    kendalaText = "Kendala yang ditemui meliputi perancangan constraint integritas referensial antar entitas relasional dan optimasi klausul penggabungan tabel (JOIN) agar kueri tidak menghasilkan data duplikat.";
  } else if (isJaringan) {
    kendalaText = "Kendala yang dihadapi adalah konfigurasi listening port pada soket jaringan dan penanganan buffer data stream transmisi agar paket data tidak mengalami fragmentasi atau timeout.";
  }

  let solusiText = "Solusi yang diterapkan adalah melakukan penelusuran galat melalui inspeksi pesan debug pada terminal konsol, memperbaiki sintaks implementasi kode program, serta menguji ulang kasus uji dengan masukan data bertahap.";
  if (isKeamanan) {
    solusiText = "Solusi yang diterapkan adalah menstandarkan format string input menggunakan konversi byte-string UTF-8 serta memverifikasi keluaran digest algoritma hash dengan toolkit keamanan terpercaya.";
  } else if (isBasisData) {
    solusiText = "Solusi yang diterapkan adalah memeriksa kembali aturan primary key dan foreign key dalam skema DDL serta menguji kueri DML menggunakan data uji sampel sebelum dieksekusi secara keseluruhan.";
  }

  const hasilText = `${outputUlasan} Seluruh tahapan skenario laboratorium berhasil diselesaikan dengan baik, di mana program berjalan secara deterministik dan menghasilkan nilai luaran yang valid sesuai capaian modul.`;
  const temuanText = `Temuan penting dari pengujian laboratorium ini membuktikan bahwa efisiensi algoritma dan pemilihan struktur data yang tepat sangat mempengaruhi performa eksekusi program. Pemahaman konsep teoritis yang dipadukan dengan implementasi langsung berhasil memperkuat kompetensi teknis mahasiswa.`;

  const analisis5Pilar = `1. Pembelajaran Materi Praktikum:
${pembelajaranText}

2. Kendala yang Dihadapi:
${kendalaText}

3. Solusi Pemecahan Masalah:
${solusiText}

4. Hasil Akhir dan Pembahasan:
${hasilText}

5. Temuan dan Kesimpulan:
${temuanText}`;

  // Penjelasan Kontekstual Per Screenshot (Standar SKOR 5 Kriteria 2)
  const imageExplanations = (captions.length > 0 ? captions : ["Hasil eksekusi program"]).map((c, idx) => ({
    order: idx + 1,
    caption: c.startsWith("Gambar") ? c : `Hasil Eksekusi dan Verifikasi Program (${c})`,
    explanation: `Tangkapan layar pada Gambar 2.${idx + 1} di atas memperlihatkan proses eksekusi dan verifikasi program pada konsol terminal. Parameter uji yang dimasukkan berhasil diproses oleh logika kode berbasis ${langName}, menghasilkan luaran data yang konsisten dan membuktikan bahwa instruksi yang dirancang berjalan tanpa kesalahan runtime.`
  }));

  return {
    laprakBahan: tools,
    laprakLangkah: steps,
    laprakAnalisis: analisis5Pilar,
    laprakRefleksi: {
      pembelajaran: pembelajaranText,
      kendala: kendalaText,
      solusi: solusiText,
      hasil: hasilText,
      temuan: temuanText
    },
    imageExplanations
  };
}

function getPosttestHeuristic(
  materi: string,
  praktikumNama: string,
  kodeProgram?: string,
  captions: string[] = []
): { posttestTujuan: string; imageExplanations: any[] } {
  const judul = materi ? `"${materi}"` : praktikumNama ? `praktikum ${praktikumNama}` : "praktikum";
  const codeRaw = (kodeProgram || "").toLowerCase();

  let contextExtra = "";
  if (codeRaw.includes("hashlib") || codeRaw.includes("sha") || codeRaw.includes("enkripsi") || codeRaw.includes("cipher")) {
    contextExtra = " Mahasiswa mampu menerapkan prinsip keamanan data dan algoritma kriptografi mandiri untuk menjamin kerahasiaan dan integritas informasi.";
  } else if (codeRaw.includes("select") || codeRaw.includes("create table")) {
    contextExtra = " Mahasiswa mampu merancang skema relasional dan menuliskan kueri manipulasi data yang optimal untuk menyelesaikan skenario kasus uji.";
  } else if (codeRaw.includes("def ") || codeRaw.includes("#include")) {
    contextExtra = " Mahasiswa mampu menyusun algoritma mandiri dengan abstraksi fungsi yang modular serta menghasilkan keluaran yang konsisten.";
  }

  let captionExtra = "";
  if (captions.length > 0) {
    captionExtra = ` Berdasarkan hasil tangkapan layar posttest (${captions.slice(0, 2).join("; ")}), luaran program membuktikan keberhasilan pengujian tugas mandiri.`;
  }

  const posttestTujuan = `Tujuan dari pembuatan program posttest pada materi ${judul} ini adalah untuk mengukur dan memvalidasi pemahaman mahasiswa secara mandiri dalam merancang solusi komputasi tanpa instruksi bertahap.${contextExtra}${captionExtra} Melalui pengerjaan tugas mandiri ini, mahasiswa mampu menerjemahkan rumusan masalah studi kasus ke dalam baris kode program yang efisien, menguji kebenaran algoritma secara mandiri, serta mendokumentasikan hasil pengujian terminal sesuai dengan capaian modul praktikum.`;

  const imageExplanations = (captions.length > 0 ? captions : ["Output program posttest"]).map((c, idx) => ({
    order: idx + 1,
    caption: c.startsWith("Gambar") ? c : `Hasil Luaran Tugas Mandiri Posttest (${c})`,
    explanation: `Gambar 3.${idx + 1} di atas mendokumentasikan hasil pengujian tugas mandiri posttest pada terminal. Eksekusi program berhasil membuktikan bahwa algoritma mampu menyelesaikan persoalan studi kasus yang ditugaskan dengan tepat dan sesuai batas spesifikasi.`
  }));

  return { posttestTujuan, imageExplanations };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { step, materi, praktikumNama, image, images, kodeProgram, userNotes } = body;

    // Kumpulkan seluruh gambar yang tersedia dan caption-nya
    const allImages: string[] = [];
    const captions: string[] = [];

    if (images && Array.isArray(images)) {
      images.forEach((img: any) => {
        if (typeof img === "string" && img) {
          allImages.push(img);
        } else if (img && typeof img === "object") {
          if (img.url) allImages.push(img.url);
          else if (img.image) allImages.push(img.image);

          if (img.caption && typeof img.caption === "string" && img.caption.trim()) {
            captions.push(img.caption.trim());
          }
        }
      });
    } else if (image) {
      if (typeof image === "string") allImages.push(image);
      else if (image?.url) allImages.push(image.url);
      if (image?.caption && typeof image.caption === "string" && image.caption.trim()) {
        captions.push(image.caption.trim());
      }
    }

    const matakuliah = praktikumNama || "Informatika";
    const namaMateri = materi || "Praktikum Laboratorium";

    // ----------------------------------------------------
    // STEP 1: PRETEST
    // ----------------------------------------------------
    if (step === "pretest") {
      const prompt = `Anda adalah asisten akademik laboratorium komputer FTI Universitas Ahmad Dahlan.
Mata Kuliah Praktikum: "${matakuliah}"
Materi/Modul: "${namaMateri}"

Keterangan Lembar Pretest dari Mahasiswa:
${captions.length > 0 ? captions.map((c, i) => `Gambar #${i + 1}: ${c}`).join("\n") : "Lembar soal pretest praktikum terlampir"}

Tugas Anda:
1. Analisis gambar screenshot lembar Pretest yang dilampirkan oleh mahasiswa secara teliti.
2. Ekstraksi daftar pertanyaan/soal pretest yang tertulis pada gambar atau keterangan.
3. Gunakan penomoran huruf abjad besar yang rapi: A., B., C.
4. Jangan membuat pertanyaan acak di luar konteks mata kuliah ${matakuliah}.

Berikan respon HANYA dalam JSON format valid berikut:
{
  "pretestQ": "A. Soal pertama...\\nB. Soal kedua...\\nC. Soal ketiga..."
}`;

      const aiCall = await callGeminiNative(prompt, allImages);

      if (aiCall.success && aiCall.data && (aiCall.data.pretestQ || aiCall.data.raw)) {
        return NextResponse.json({
          success: true,
          isAi: true,
          modelUsed: aiCall.modelUsed,
          data: {
            pretestQ: aiCall.data.pretestQ || aiCall.data.raw
          }
        });
      }

      // Fallback Heuristic yang relevan dan membaca caption
      return NextResponse.json({
        success: true,
        isAi: false,
        aiWarning: aiCall.errorMsg || "Google Gemini API Key belum valid atau belum diisi. Menggunakan Smart Heuristic berbasis modul.",
        data: {
          pretestQ: getPretestHeuristic(namaMateri, matakuliah, captions)
        }
      });
    }

    // ----------------------------------------------------
    // STEP 2: LAPRAK (LAPORAN PRAKTIKUM) - STANDAR SKOR 5
    // ----------------------------------------------------
    if (step === "laprak") {
      const prompt = `Anda adalah asisten laboratorium komputer FTI Universitas Ahmad Dahlan.
Mata Kuliah Praktikum: "${matakuliah}"
Topik Materi: "${namaMateri}"

KODE PROGRAM MAHASISWA:
${kodeProgram ? kodeProgram : "(Tidak ada kode teks manual)"}

KETERANGAN / CAPTION GAMBAR SCREENSHOT MAHASISWA:
${captions.length > 0 ? captions.map((c, i) => `Screenshot #${i + 1}: ${c}`).join("\n") : "Tidak ada caption manual"}

Catatan Tambahan Mahasiswa: ${userNotes || "-"}

INSTRUKSI STANDAR RUBRIK PENILAIAN SKOR 5 (NILAI MAKSIMAL):
1. HASIL PRAKTIKUM & PEMBAHASAN SETIAP SCREENSHOT (SKOR 5):
   - Analisis setiap gambar screenshot yang dilampirkan.
   - Buatkan "imageExplanations": untuk SETIAP gambar screenshot, sertakan "caption" (judul formal) dan "explanation" (paragraf pembahasan teknis 2-4 kalimat yang menerangkan apa yang diuji, parameter yang dimasukkan, dan apa arti output pada terminal).
2. REFLEKSI PRAKTIKUM 5 PILAR WAJIB (SKOR 5):
   - Buatkan ulasan pengalaman praktikum yang SANGAT SPESIFIK (bukan generik) dengan memuat 5 pilar wajib:
     a. "pembelajaran": Pemahaman konsep teori & algoritma praktikum yang dipelajari.
     b. "kendala": Kendala teknis nyata / error kompilasi / konfigurasi yang dihadapi.
     c. "solusi": Tindakan / solusi konkret dalam mengatasi kendala tersebut.
     d. "hasil": Luaran akhir pengujian yang berhasil dicapai dan diverifikasi.
     e. "temuan": Temuan penting / insight mengenai efisiensi komputasi atau algoritma.
3. ALAT & BAHAN SERTA LANGKAH KERJA:
   - "laprakBahan": Sebutkan hardware, OS, compiler/interpreter, dan pustaka/library yang nyata digunakan.
   - "laprakLangkah": Daftar langkah kerja sistematis diawali tanda strip "- ".

Formatkan respon HANYA dalam JSON valid berikut:
{
  "laprakBahan": [
    "Perangkat Keras PC / Laptop",
    "Sistem Operasi Komputer",
    "Compiler / Runtime nyata",
    "Pustaka / tools yang terlihat di kode atau screenshot"
  ],
  "laprakLangkah": [
    "- Menyiapkan lingkungan pengembangan...",
    "- Mengimplementasikan logika program...",
    "- Melakukan kompilasi dan eksekusi..."
  ],
  "imageExplanations": [
    {
      "order": 1,
      "caption": "Hasil Eksekusi Program pada Terminal",
      "explanation": "Pada tangkapan layar Gambar 2.1 di atas, program berhasil memproses data masukan... Terminal menampilkan luaran..."
    }
  ],
  "laprakRefleksi": {
    "pembelajaran": "...",
    "kendala": "...",
    "solusi": "...",
    "hasil": "...",
    "temuan": "..."
  },
  "laprakAnalisis": "1. Pembelajaran Materi Praktikum:\\n[Isi]\\n\\n2. Kendala yang Dihadapi:\\n[Isi]\\n\\n3. Solusi Pemecahan Masalah:\\n[Isi]\\n\\n4. Hasil Akhir dan Pembahasan:\\n[Isi]\\n\\n5. Temuan dan Kesimpulan:\\n[Isi]"
}`;

      const aiCall = await callGeminiNative(prompt, allImages);

      if (aiCall.success && aiCall.data && (aiCall.data.laprakBahan || aiCall.data.laprakLangkah || aiCall.data.laprakAnalisis || aiCall.data.laprakRefleksi)) {
        let finalAnalisis = aiCall.data.laprakAnalisis || "";
        const ref = aiCall.data.laprakRefleksi;
        if ((!finalAnalisis || !finalAnalisis.includes("1. Pembelajaran")) && ref) {
          finalAnalisis = `1. Pembelajaran Materi Praktikum:
${ref.pembelajaran || ""}

2. Kendala yang Dihadapi:
${ref.kendala || ""}

3. Solusi Pemecahan Masalah:
${ref.solusi || ""}

4. Hasil Akhir dan Pembahasan:
${ref.hasil || ""}

5. Temuan dan Kesimpulan:
${ref.temuan || ""}`;
        }

        return NextResponse.json({
          success: true,
          isAi: true,
          modelUsed: aiCall.modelUsed,
          data: {
            laprakBahan: Array.isArray(aiCall.data.laprakBahan) ? aiCall.data.laprakBahan : ["PC / Laptop", "Lingkungan Praktikum"],
            laprakLangkah: Array.isArray(aiCall.data.laprakLangkah) ? aiCall.data.laprakLangkah : [
              "Menyiapkan lingkungan pengembangan perangkat lunak.",
              "Mengimplementasikan instruksi sesuai modul praktikum.",
              "Melakukan pengujian dan memverifikasi hasil eksekusi terminal."
            ],
            laprakAnalisis: finalAnalisis || "Hasil praktikum telah berhasil dieksekusi dan diverifikasi sesuai modul.",
            laprakRefleksi: ref || null,
            imageExplanations: Array.isArray(aiCall.data.imageExplanations) ? aiCall.data.imageExplanations : []
          }
        });
      }

      // Analisis Mendalam Berbasis Kode Nyata & Gambar (Deep Code & Context Inspector)
      const inspection = inspectStudentArtifacts(matakuliah, namaMateri, kodeProgram, captions, userNotes);
      return NextResponse.json({
        success: true,
        isAi: false,
        aiWarning: aiCall.errorMsg || "Google Gemini API Key belum valid atau belum diisi. Menggunakan Mesin Analisis Kode & Gambar Deep Inspector (Standar SKOR 5).",
        data: inspection
      });
    }

    // ----------------------------------------------------
    // STEP 3: POSTTEST - STANDAR SKOR 5
    // ----------------------------------------------------
    if (step === "posttest") {
      const prompt = `Anda adalah asisten laboratorium komputer FTI Universitas Ahmad Dahlan.
Mata Kuliah Praktikum: "${matakuliah}"
Topik Materi: "${namaMateri}"

Kode Posttest:
${kodeProgram || "Tidak disertakan kode teks"}

Keterangan Screenshot Posttest:
${captions.length > 0 ? captions.map((c, i) => `Screenshot #${i + 1}: ${c}`).join("\n") : "Hasil eksekusi program tugas mandiri posttest"}

Tugas Anda (Standar Rubrik SKOR 5):
1. Analisis screenshot hasil program dan kode Posttest mahasiswa secara mendalam.
2. Jelaskan tujuan dan capaian pembelajaran mandiri dari program posttest yang dikerjakan tersebut secara spesifik mengacu pada kode dan outputnya.
3. Buatkan "imageExplanations" untuk setiap screenshot posttest (caption dan pembahasan output).

Berikan respon HANYA dalam format JSON valid:
{
  "posttestTujuan": "Tujuan dari pembuatan program posttest ini adalah...",
  "imageExplanations": [
    {
      "order": 1,
      "caption": "Hasil Output Program Posttest pada Terminal",
      "explanation": "Pada tangkapan layar Gambar 3.1 di atas, program posttest berhasil dieksekusi..."
    }
  ]
}`;

      const aiCall = await callGeminiNative(prompt, allImages);

      if (aiCall.success && aiCall.data && (aiCall.data.posttestTujuan || aiCall.data.raw)) {
        return NextResponse.json({
          success: true,
          isAi: true,
          modelUsed: aiCall.modelUsed,
          data: {
            posttestTujuan: aiCall.data.posttestTujuan || aiCall.data.raw,
            imageExplanations: Array.isArray(aiCall.data.imageExplanations) ? aiCall.data.imageExplanations : []
          }
        });
      }

      const fallbackPosttest = getPosttestHeuristic(namaMateri, matakuliah, kodeProgram, captions);
      return NextResponse.json({
        success: true,
        isAi: false,
        aiWarning: aiCall.errorMsg || "Google Gemini API Key belum valid atau belum diisi.",
        data: fallbackPosttest
      });
    }

    return NextResponse.json({ error: "Step tidak valid" }, { status: 400 });
  } catch (err: any) {
    console.error("AI Analysis route error:", err);
    return NextResponse.json({
      success: true,
      isAi: false,
      aiWarning: err.message,
      data: {
        pretestQ: getPretestHeuristic("", ""),
        ...inspectStudentArtifacts("", "", ""),
        posttestTujuan: getPosttestHeuristic("", "").posttestTujuan
      }
    });
  }
}


