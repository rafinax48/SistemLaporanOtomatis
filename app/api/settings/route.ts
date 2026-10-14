import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Coba via Prisma model jika sudah generated, fallback via $queryRawUnsafe
    let settings: any = null;
    try {
      if ((prisma as any).settings) {
        settings = await (prisma as any).settings.findUnique({
          where: { id: "singleton" }
        });
      }
    } catch {
      // fallback
    }

    if (!settings) {
      try {
        const rows: any[] = await prisma.$queryRawUnsafe(
          `SELECT * FROM Settings WHERE id = 'singleton' LIMIT 1`
        );
        settings = rows.length > 0 ? rows[0] : null;
      } catch {
        // jika tabel belum siap
      }
    }

    const defaultModel = "gemini-3.8-flash";
    const apiKey = settings?.apiKey || "";
    const selectedModel = settings?.selectedModel || defaultModel;

    // Masking API key untuk preview keamanan di UI (misal: AIzaSy...xxxx)
    const maskedKey = apiKey
      ? apiKey.length > 8
        ? `${apiKey.substring(0, 6)}...${apiKey.substring(apiKey.length - 4)}`
        : "••••••••"
      : "";

    return NextResponse.json({
      success: true,
      hasCustomKey: Boolean(apiKey),
      maskedKey,
      selectedModel,
      isEnvKeyPresent: Boolean(process.env.GEMINI_API_KEY)
    });
  } catch (err: any) {
    console.error("GET /api/settings error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { apiKey, selectedModel } = body;

    const chosenModel = selectedModel ? String(selectedModel).trim() : "gemini-3.8-flash";
    const cleanApiKey = apiKey !== undefined && apiKey !== null ? String(apiKey).trim() : null;

    // Cek apakah singleton sudah ada
    const existingRows = (await prisma.$queryRawUnsafe(
      `SELECT id FROM Settings WHERE id = 'singleton' LIMIT 1`
    ).catch(() => [])) as any[];

    const nowIso = new Date().toISOString();

    if (existingRows.length > 0) {
      await prisma.$executeRawUnsafe(
        `UPDATE Settings SET apiKey = ?, selectedModel = ?, updatedAt = ? WHERE id = 'singleton'`,
        cleanApiKey,
        chosenModel,
        nowIso
      );
    } else {
      await prisma.$executeRawUnsafe(
        `INSERT INTO Settings (id, apiKey, selectedModel, updatedAt, createdAt) VALUES ('singleton', ?, ?, ?, ?)`,
        cleanApiKey,
        chosenModel,
        nowIso,
        nowIso
      );
    }

    return NextResponse.json({
      success: true,
      message: "Pengaturan model AI dan API Key berhasil disimpan.",
      selectedModel: chosenModel,
      hasCustomKey: Boolean(cleanApiKey)
    });
  } catch (err: any) {
    console.error("POST /api/settings error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
