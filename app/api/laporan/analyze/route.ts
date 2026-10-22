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
  const isMultimedia = combined.includes("multimedia") || combined.includes("audio") || combined.includes("video") || combined.includes("animasi") || combined.includes("blender") || combined.includes("maya");
  const isNLP = combined.includes("bahasa") || combined.includes("nlp") || combined.includes("text") || combined.includes("token") || combined.includes("stemming");
  const isDeepLearning = combined.includes("mendalam") || combined.includes("deep") || combined.includes("neural") || combined.includes("cnn") || combined.includes("lstm");
  const isWeb = combined.includes("web") || combined.includes("frontend") || combined.includes("backend") || codeLower.includes("<?php");
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

  // Cek apakah ada kode nyata
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
    (codeLower.includes("from ") && codeLower.includes("where "));

  const hasRealJava =
    codeLower.includes("public class") ||
    codeLower.includes("system.out.print");

  const hasRealCpp =
    (codeLower.includes("#include") || codeLower.includes("cout <<") || codeLower.includes("cin >>") || codeLower.includes("std::")) &&
    !isKeamanan && !isBasisData && !isMultimedia && !isNLP && !isDeepLearning && !isWeb;

  // PRIORITAS 1: PYTHON (Keamanan Komputer, NLP, Deep Learning, Data Science)
  if (hasRealPython || isKeamanan || isNLP || isDeepLearning) {
    if (isNLP) {
      langName = "Python 3.x (Natural Language Processing)";
      compilerRuntime = "Interpreter Python 3.10+ (Lingkungan NLP & Data Science)";
      editorIde = "Visual Studio Code / Jupyter Notebook / Google Colab";
      if (codeLower.includes("nltk")) libraries.push("NLTK");
      if (codeLower.includes("sastrawi")) libraries.push("PySastrawi");
      if (codeLower.includes("spacy")) libraries.push("SpaCy");
      if (codeLower.includes("sklearn")) libraries.push("Scikit-Learn (TF-IDF)");
      if (libraries.length === 0) libraries.push("NLTK", "PySastrawi", "Regex");
    } else if (isDeepLearning) {
      langName = "Python 3.x (Deep Learning Framework)";
      compilerRuntime = "Interpreter Python 3.10+ dengan Akselerasi GPU CUDA";
      editorIde = "Google Colab / Jupyter Lab / Visual Studio Code";
      if (codeLower.includes("torch")) libraries.push("PyTorch");
      if (codeLower.includes("tensorflow") || codeLower.includes("keras")) libraries.push("TensorFlow / Keras");
      if (codeLower.includes("numpy")) libraries.push("NumPy");
      if (codeLower.includes("matplotlib")) libraries.push("Matplotlib");
      if (libraries.length === 0) libraries.push("TensorFlow", "Keras", "NumPy");
    } else {
      langName = "Python 3.x";
      compilerRuntime = "Interpreter Python 3.x (Python Runtime)";
      editorIde = "Visual Studio Code / Terminal Linux / Windows";
    }

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
  // PRIORITAS 2: MULTIMEDIA
  else if (isMultimedia) {
    langName = "Multimedia & Grafika Komputer";
    compilerRuntime = "Software Pengolah Audio-Visual & Rendering 2D/3D (Adobe Premiere / Photoshop / Audacity / Maya / Blender)";
    editorIde = "Visual Studio Code / Adobe Creative Cloud / Blender Studio / Web Browser";

    if (codeLower.includes("canvas") || codeLower.includes("<script") || codeLower.includes("three")) libraries.push("Three.js / HTML5 Canvas");
    if (codeLower.includes("mel") || codeLower.includes("maya")) libraries.push("Maya Embedded Language (MEL)");
    if (libraries.length === 0) {
      libraries.push("Adobe Premiere Pro", "Audacity Audio Editor", "Blender 3D", "Photoshop");
    }
  }
  // PRIORITAS 3: WEB DINAMIS (PHP & JS)
  else if (isWeb || codeLower.includes("<?php")) {
    langName = codeLower.includes("<?php") ? "PHP 8.x & JavaScript" : "JavaScript / Node.js";
    compilerRuntime = "Web Server Apache / Nginx & Node.js Runtime (XAMPP Control Panel)";
    editorIde = "Visual Studio Code / Web Browser Google Chrome / Postman";

    if (codeLower.includes("session")) libraries.push("Manajemen Session PHP");
    if (codeLower.includes("pdo") || codeLower.includes("mysqli")) libraries.push("Ekstensi Database MySQLi / PDO");
    if (codeLower.includes("json")) libraries.push("JSON Parser & REST API");
    if (libraries.length === 0) libraries.push("PHP 8.x", "MySQL Database", "Bootstrap / Tailwind CSS");
  }
  // PRIORITAS 4: SQL (Basis Data)
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
  // PRIORITAS 5: JAVA
  else if (hasRealJava) {
    langName = "Java (JDK)";
    compilerRuntime = "Java Development Kit (JDK 17+) / JVM";
    editorIde = "IntelliJ IDEA / Eclipse / Visual Studio Code";

    const javaFns = codeRaw.matchAll(/(?:public|private|static|\s)+\s+(?:void|int|String|boolean)\s+([a-zA-Z0-9_]{3,30})\s*\(/g);
    for (const m of javaFns) {
      if (m[1] && m[1] !== "main" && !functions.includes(m[1])) functions.push(m[1]);
    }
  }
  // PRIORITAS 6: C / C++
  else {
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
  } else if (isMultimedia) {
    tools.push("Aplikasi Desain & Pengolah Audio-Visual (Audacity / Blender / Premiere)");
  } else if (isNLP) {
    tools.push("Corpus Teks & Pustaka NLP (NLTK / Sastrawi)");
  } else if (isDeepLearning) {
    tools.push("Dataset Pelatihan Model & Akselerator GPU CUDA");
  } else if (isWeb) {
    tools.push("RDBMS MySQL & Postman API Client");
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

  // 4. Susun Analisis Teknis AI & Refleksi Ulasan Mahasiswa
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

  // Komponen Refleksi untuk Ulasan Mahasiswa
  const pembelajaranText = `Melalui pelaksanaan praktikum pada mata kuliah "${praktikumNama || "Informatika"}" dengan materi "${materi || "Praktikum"}", mahasiswa memahami secara mendalam arsitektur komputasi dan kaidah implementasi program berbasis ${langName}.${fungsiUlasan} Mahasiswa mampu menganalisis keterkaitan antara struktur data masukan dan respon keluaran terminal secara analitis.`;

  let kendalaText = "Pada tahap awal pengujian, kendala teknis yang dihadapi mencakup penyesuaian dependensi runtime lingkungan kerja serta verifikasi penanganan tipe data masukan agar tidak memicu eksepsi saat kompilasi.";
  if (isKeamanan) {
    kendalaText = "Kendala teknis yang dihadapi adalah penyesuaian format encoding biner pada algoritma kriptografi serta sinkronisasi penanganan kunci enkripsi/dekripsi agar luaran digest hash tidak mengalami mismatch.";
  } else if (isBasisData) {
    kendalaText = "Kendala yang ditemui meliputi perancangan constraint integritas referensial antar entitas relasional dan optimasi klausul penggabungan tabel (JOIN) agar kueri tidak menghasilkan data duplikat.";
  } else if (isMultimedia) {
    kendalaText = "Kendala yang dihadapi adalah penyesuaian resolusi rendering, sinkronisasi timeline layer audio-visual, serta keterbatasan kapasitas komputasi perangkat saat proses ekspor aset media.";
  } else if (isNLP) {
    kendalaText = "Kendala yang ditemui mencakup penanganan karakter non-alfanumerik pada tahapan pembersihan teks (cleansing) serta penyesuaian korpus stopword bahasa Indonesia agar tokenisasi tetap mempertahankan konteks makna kalimat.";
  } else if (isDeepLearning) {
    kendalaText = "Kendala yang dialami adalah terjadinya overfitting pada iterasi awal pelatihan model serta penyesuaian ukuran batch (batch size) agar tidak melampaui memori VRAM GPU.";
  }

  let solusiText = "Solusi yang diterapkan adalah melakukan penelusuran galat melalui inspeksi pesan debug pada terminal konsol, memperbaiki sintaks implementasi kode program, serta menguji ulang kasus uji dengan masukan data bertahap.";
  if (isKeamanan) {
    solusiText = "Solusi yang diterapkan adalah menstandarkan format string input menggunakan konversi byte-string UTF-8 serta memverifikasi keluaran digest algoritma hash dengan toolkit keamanan terpercaya.";
  } else if (isBasisData) {
    solusiText = "Solusi yang diterapkan adalah memeriksa kembali aturan primary key dan foreign key dalam skema DDL serta menguji kueri DML menggunakan data uji sampel sebelum dieksekusi secara keseluruhan.";
  } else if (isMultimedia) {
    solusiText = "Solusi yang diterapkan adalah melakukan penataan keyframe secara presisi pada timeline, mengoptimasi parameter kompresi bitrate keluaran, serta memanfaatkan fitur caching render.";
  } else if (isNLP) {
    solusiText = "Solusi yang diterapkan adalah menyusun aturan ekspresi reguler (Regex) untuk penyaringan noise dan memanfaatkan kamus leksikal Sastrawi secara berurutan.";
  } else if (isDeepLearning) {
    solusiText = "Solusi yang diterapkan adalah menerapkan teknik regularisasi Dropout, normalisasi batch, serta mengatur learning rate decay selama proses optimasi bobot model.";
  }

  const hasilText = `${outputUlasan} Seluruh tahapan skenario laboratorium berhasil diselesaikan dengan baik, di mana program berjalan secara deterministik dan menghasilkan nilai luaran yang valid sesuai capaian modul.`;
  const temuanText = `Temuan penting dari pengujian laboratorium ini membuktikan bahwa efisiensi algoritma dan pemilihan struktur data yang tepat sangat mempengaruhi performa eksekusi program. Pemahaman konsep teoritis yang dipadukan dengan implementasi langsung berhasil memperkuat kompetensi teknis mahasiswa.`;

  // E. ANALISIS PRAKTIKUM (Dihasilkan oleh AI - Analisis Teknis Komprehensif)
  const analisisTeknisAI = `Berdasarkan pengujian dan implementasi program pada mata kuliah "${praktikumNama || "Informatika"}" dengan materi "${materi || "Praktikum"}", analisis teknis menunjukkan bahwa arsitektur kode berbasis ${langName} berhasil dirancang secara modular dan efisien.${fungsiUlasan}

Alur eksekusi komputasi berlangsung secara deterministik dari inisialisasi lingkungan kerja, alokasi memori objek, hingga pemrosesan instruksi kondisional dan perulangan. Data masukan telah melalui tahapan validasi yang memadai sebelum diteruskan ke fungsi pemroses utama. ${outputUlasan}

Dari aspek keandalan sistem, mekanisme penanganan eksepsi dan keterkaitan antara blok kode program dengan luaran pada tangkapan layar terminal membuktikan bahwa instruksi yang dieksekusi memiliki stabilitas tinggi tanpa terjadi kebocoran memori atau kesalahan runtime. Kinerja program konsisten dalam memproses berbagai variasi data uji sesuai sasaran capaian modul laboratorium.`;

  // F. ULASAN PRAKTIKUM (Default Ulasan Mahasiswa - Input Manual)
  const ulasanMahasiswaDefault = `1. Pembelajaran:
${pembelajaranText}

2. Kendala:
${kendalaText}

3. Solusi:
${solusiText}

4. Hasil:
${hasilText}

5. Temuan:
${temuanText}`;

  // Penjelasan Kontekstual Per Screenshot: FOKUS PADA ALUR EKSEKUSI & LUARAN TERMINAL (Point 2)
  const imageExplanations = (captions.length > 0 ? captions : ["Hasil eksekusi program"]).map((c, idx) => {
    const cleanCap = c.startsWith("Gambar") ? c : `Pengujian dan Luaran Program (${c})`;
    const fnRef = functions[idx] ? `fungsi \`${functions[idx]}()\`` : "fungsi logika utama";
    const outRef = printOutputs[idx] ? `menampilkan pesan luaran: "${printOutputs[idx]}"` : "menampilkan data keluaran yang terstruktur dan terverifikasi";

    return {
      order: idx + 1,
      caption: cleanCap,
      explanation: `Berdasarkan tangkapan layar Gambar 2.${idx + 1}, alur eksekusi program diawali dengan inisialisasi lingkungan kerja ${langName} dan pemanggilan ${fnRef} untuk memproses data masukan uji. Pada luaran terminal/konsol pengujian, sistem ${outRef} yang mengonfirmasi bahwa seluruh instruksi logika dieksekusi secara sukses tanpa mengalami galat sintaksis maupun runtime.`
    };
  });

  return {
    laprakBahan: tools,
    laprakLangkah: steps,
    laprakAnalisis: analisisTeknisAI,
    laprakUlasan: ulasanMahasiswaDefault,
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

function generateSingleImageExplanationFallback(
  matakuliah: string,
  materi: string,
  prefix: string,
  order: number,
  userCaption: string,
  kodeProgram?: string
): { caption: string; explanation: string } {
  const combined = `${matakuliah} ${materi} ${userCaption} ${kodeProgram || ""}`.toLowerCase();
  const captionResult = userCaption && userCaption.trim()
    ? userCaption.trim()
    : `Hasil Eksekusi dan Luaran Terminal Program ${order}`;

  if (combined.includes("multimedia") || combined.includes("video") || combined.includes("audio") || combined.includes("animasi")) {
    return {
      caption: userCaption || `Tampilan Antarmuka dan Pratinjau Luaran Media ${order}`,
      explanation: `Pada tangkapan layar Gambar ${prefix}.${order} di atas, diperlihatkan antarmuka software pengolah multimedia selama proses penyuntingan dan penataan layer timeline. Alur kerja dimulai dari inisialisasi berkas aset, konfigurasi efek visual/audio, hingga eksekusi pengujian pratinjau (preview). Luaran visual dan gelombang audio membuktikan bahwa sinkronisasi frame berjalan lancar tanpa mengalami lag atau distorsi render.`
    };
  }

  if (combined.includes("bahasa") || combined.includes("nlp") || combined.includes("token")) {
    return {
      caption: userCaption || `Hasil Eksekusi Pipeline Pemrosesan Teks pada Terminal ${order}`,
      explanation: `Pada tangkapan layar Gambar ${prefix}.${order} di atas, ditampilkan konsol terminal hasil eksekusi skrip pengolahan teks. Alur program diawali dengan pembacaan korpus masukan, dilanjutkan dengan tahap case folding, pembersihan karakter non-alfanumerik, hingga proses tokenisasi. Luaran terminal secara eksplisit memperlihatkan daftar token yang terpisah secara presisi sesuai aturan pemodelan linguistik tanpa memicu galat runtime.`
    };
  }

  if (combined.includes("mendalam") || combined.includes("deep") || combined.includes("neural") || combined.includes("cnn")) {
    return {
      caption: userCaption || `Grafik Pelatihan Model dan Evaluasi Metrik ${order}`,
      explanation: `Pada tangkapan layar Gambar ${prefix}.${order} di atas, diperlihatkan log eksekusi terminal dan kurva performa pelatihan model. Alur komputasi menunjukkan proses forward pass, kalkulasi fungsi loss, dan pembaharuan bobot melalui backpropagation. Luaran pada konsol membuktikan penurunan nilai loss yang stabil serta peningkatan metrik akurasi seiring bertambahnya epoch pelatihan.`
    };
  }

  if (combined.includes("web") || combined.includes("php") || combined.includes("login") || combined.includes("session")) {
    return {
      caption: userCaption || `Tampilan Antarmuka Web dan Respon Server ${order}`,
      explanation: `Pada tangkapan layar Gambar ${prefix}.${order} di atas, ditampilkan halaman peramban web dan log respon server lokal. Alur pengujian mendemonstrasikan proses pengiriman formulir dengan metode HTTP POST, verifikasi kredensial pada layer logika, serta inisialisasi sesi pengguna. Luaran antarmuka dan konsol jaringan memverifikasi bahwa pertukaran data berhasil diproses dengan status kode HTTP 200 OK secara aman.`
    };
  }

  if (combined.includes("keamanan") || combined.includes("kripto") || combined.includes("hash")) {
    return {
      caption: userCaption || `Keluaran Nilai Hash dan Uji Integritas Pesan ${order}`,
      explanation: `Pada tangkapan layar Gambar ${prefix}.${order} di atas, ditampilkan hasil eksekusi program keamanan komputer pada konsol terminal. Alur program diawali dengan penerimaan string teks masukan yang kemudian diproses melalui algoritma fungsi hash satu arah. Luaran terminal memperlihatkan nilai digest heksadesimal dengan panjang bit yang tepat dan terbukti konsisten memenuhi prinsip efek avalanche.`
    };
  }

  if (combined.includes("basis data") || combined.includes("database") || combined.includes("sql")) {
    return {
      caption: userCaption || `Hasil Eksekusi Kueri dan Tabel Data Relasional ${order}`,
      explanation: `Pada tangkapan layar Gambar ${prefix}.${order} di atas, ditampilkan antarmuka konsol basis data beserta tabel rekaman hasil eksekusi kueri SQL. Alur eksekusi membuktikan validitas instruksi DDL/DML dalam memanipulasi tupel baris data sesuai integritas referensial. Luaran tabel terminal menunjukkan bahwa data tersimpan dan terpanggil secara akurat tanpa adanya anomali redudansi.`
    };
  }

  return {
    caption: captionResult,
    explanation: `Pada tangkapan layar Gambar ${prefix}.${order} di atas, terdokumentasi jendela terminal pengujian program. Alur eksekusi memperlihatkan pemberian parameter masukan pengujian dan proses komputasi algoritma utama. Luaran konsol membuktikan bahwa program berjalan secara stabil, menyelesaikan perhitungan dengan presisi, dan mengeluarkan hasil yang sesuai dengan target spesifikasi modul praktikum.`
  };
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
1. PEMBAHASAN SETIAP SCREENSHOT (ALUR & LUARAN TERMINAL):
   - Analisis setiap gambar screenshot yang dilampirkan mahasiswa.
   - Buatkan "imageExplanations": untuk SETIAP gambar screenshot, sertakan "caption" (judul formal) dan "explanation" (paragraf pembahasan 2-4 kalimat yang WAJIB menguraikan:
     a) Alur Eksekusi Program: inisialisasi lingkungan, alur logika perintah, fungsi yang dipanggil.
     b) Luaran Terminal / Output: teks luaran, pesan status, atau nilai keluaran yang tampak pada konsol terminal/jendela aplikasi beserta maknanya).
2. ANALISIS PRAKTIKUM (EKSPLISIT DIBUAT OLEH AI):
   - "laprakAnalisis": Analisis teknis mendalam mengenai arsitektur kode, mekanisme kerja logika algoritma, modularitas fungsi, dan validasi fungsionalitas sistem.
3. REFLEKSI ULASAN MAHASISWA (5 PILAR):
   - "laprakUlasan": Draf ulasan refleksi mahasiswa memuat 5 pilar:
     1. Pembelajaran: Pemahaman konsep materi.
     2. Kendala: Kendala teknis / error yang dihadapi.
     3. Solusi: Cara mengatasi kendala.
     4. Hasil: Verifikasi keberhasilan pengujian.
     5. Temuan: Insight / best practice algoritma.
4. ALAT & BAHAN SERTA LANGKAH KERJA:
   - "laprakBahan": Sebutkan hardware, OS, compiler/interpreter, dan software/tools nyata yang digunakan.
   - "laprakLangkah": Daftar langkah kerja sistematis diawali tanda strip "- ".

Formatkan respon HANYA dalam JSON valid berikut:
{
  "laprakBahan": [
    "Perangkat Keras PC / Laptop",
    "Sistem Operasi Komputer",
    "Compiler / Software / Runtime nyata",
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
      "caption": "Hasil Eksekusi dan Verifikasi Program pada Terminal",
      "explanation": "Berdasarkan tangkapan layar Gambar 2.1 di atas, alur eksekusi program diawali dengan... Pada luaran terminal, sistem menampilkan..."
    }
  ],
  "laprakAnalisis": "Berdasarkan pengujian dan analisis teknis terhadap kode program dan screenshot...",
  "laprakUlasan": "1. Pembelajaran:\\n[Isi]\\n\\n2. Kendala:\\n[Isi]\\n\\n3. Solusi:\\n[Isi]\\n\\n4. Hasil:\\n[Isi]\\n\\n5. Temuan:\\n[Isi]"
}`;

      const aiCall = await callGeminiNative(prompt, allImages);

      if (aiCall.success && aiCall.data && (aiCall.data.laprakBahan || aiCall.data.laprakLangkah || aiCall.data.laprakAnalisis)) {
        let finalAnalisis = aiCall.data.laprakAnalisis || "";
        let finalUlasan = aiCall.data.laprakUlasan || "";
        const ref = aiCall.data.laprakRefleksi;
        if (!finalUlasan && ref) {
          finalUlasan = `1. Pembelajaran:
${ref.pembelajaran || ""}

2. Kendala:
${ref.kendala || ""}

3. Solusi:
${ref.solusi || ""}

4. Hasil:
${ref.hasil || ""}

5. Temuan:
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
            laprakUlasan: finalUlasan || null,
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

    // ----------------------------------------------------
    // STEP: IMAGE EXPLANATION (Pembahasan Screenshot Tunggal)
    // ----------------------------------------------------
    if (step === "image_explanation") {
      const targetImage = image || (allImages.length > 0 ? allImages[0] : null);
      const targetOrder = body.order || 1;
      const targetPrefix = body.sectionPrefix || "2";
      const targetCaption = body.caption || captions[0] || "";

      const prompt = `Anda adalah asisten instruktur laboratorium FTI Universitas Ahmad Dahlan.
Mata Kuliah Praktikum: "${matakuliah}"
Materi/Modul: "${namaMateri}"
Nomor Gambar Laporan: Gambar ${targetPrefix}.${targetOrder}
Caption Awal Mahasiswa: "${targetCaption || "Screenshot Hasil Pengujian Program"}"
${kodeProgram ? `Kode Program Terkait:\n\`\`\`\n${kodeProgram.slice(0, 1500)}\n\`\`\`` : ""}

Tugas Anda (Standar Rubrik SKOR 5 FTI UAD):
1. Amati gambar screenshot yang dilampirkan oleh mahasiswa (antarmuka IDE, jendela editor, terminal konsol, web browser, grafik, atau software multimedia).
2. Tuliskan pembahasan hasil screenshot yang formal, objektif, dan mendalam (1-2 paragraf padat).
3. Pembahasan WAJIB secara eksplisit menguraikan:
   a. Apa yang sedang ditampilkan pada layar/antarmuka kerja.
   b. Alur tahapan pengujian atau alur eksekusi logika kode program.
   c. Hasil luaran terminal/konsol atau respon sistem yang terlihat pada tangkapan layar, beserta validasi apakah pengujian berhasil tanpa galat/error.
4. Buatkan juga rekomendasi caption resmi yang rapi jika caption awal masih kosong atau kurang formal.

Berikan respon HANYA dalam JSON format valid:
{
  "caption": "Hasil Eksekusi Program ...",
  "explanation": "Pada tangkapan layar Gambar ${targetPrefix}.${targetOrder} di atas, terlihat antarmuka ... Alur eksekusi program dimulai dari ... Luaran terminal membuktikan bahwa ..."
}`;

      const aiCall = await callGeminiNative(prompt, targetImage ? [targetImage] : []);

      if (aiCall.success && aiCall.data && (aiCall.data.explanation || aiCall.data.raw)) {
        return NextResponse.json({
          success: true,
          isAi: true,
          modelUsed: aiCall.modelUsed,
          data: {
            caption: aiCall.data.caption || targetCaption || `Hasil Eksekusi Program ${targetOrder}`,
            explanation: aiCall.data.explanation || aiCall.data.raw
          }
        });
      }

      // Heuristik fallback kontekstual
      const fallbackExplanation = generateSingleImageExplanationFallback(
        matakuliah,
        namaMateri,
        targetPrefix,
        targetOrder,
        targetCaption,
        kodeProgram
      );

      return NextResponse.json({
        success: true,
        isAi: false,
        aiWarning: aiCall.errorMsg || "Google Gemini API Key belum valid atau belum diisi. Menggunakan analisis kontekstual akademik.",
        data: fallbackExplanation
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


