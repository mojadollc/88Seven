import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULTS = {
  themeType: "solid",
  themeColor: "#319F44",
  themeColorTo: "#59EBC6",
  themeTextColor: "#ffffff",
  themeBgColor: "#F5F5DB",
}

export async function GET() {
  try {
    const rows = await (prisma as any).$queryRaw`
      SELECT "themeType", "themeColor", "themeColorTo", "themeTextColor", "themeBgColor"
      FROM "AppSettings" WHERE key = 'global' LIMIT 1
    `
    const row = Array.isArray(rows) ? rows[0] : null
    return NextResponse.json({
      themeType: row?.themeType ?? DEFAULTS.themeType,
      themeColor: row?.themeColor ?? DEFAULTS.themeColor,
      themeColorTo: row?.themeColorTo ?? DEFAULTS.themeColorTo,
      themeTextColor: row?.themeTextColor ?? DEFAULTS.themeTextColor,
      themeBgColor: row?.themeBgColor ?? DEFAULTS.themeBgColor,
    })
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { themeType, themeColor, themeColorTo, themeTextColor, themeBgColor } = body

    // Ensure columns exist first (safe ALTER TABLE IF NOT EXISTS)
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE "AppSettings"
        ADD COLUMN IF NOT EXISTS "themeType" TEXT NOT NULL DEFAULT 'solid',
        ADD COLUMN IF NOT EXISTS "themeColor" TEXT NOT NULL DEFAULT '#319F44',
        ADD COLUMN IF NOT EXISTS "themeColorTo" TEXT NOT NULL DEFAULT '#59EBC6',
        ADD COLUMN IF NOT EXISTS "themeTextColor" TEXT NOT NULL DEFAULT '#ffffff',
        ADD COLUMN IF NOT EXISTS "themeBgColor" TEXT NOT NULL DEFAULT '#F5F5DB'
    `)

    // Upsert via raw SQL
    await (prisma as any).$executeRaw`
      INSERT INTO "AppSettings" (id, key, "themeType", "themeColor", "themeColorTo", "themeTextColor", "themeBgColor", "updatedAt")
      VALUES (gen_random_uuid(), 'global', ${themeType}, ${themeColor}, ${themeColorTo}, ${themeTextColor}, ${themeBgColor}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        "themeType" = EXCLUDED."themeType",
        "themeColor" = EXCLUDED."themeColor",
        "themeColorTo" = EXCLUDED."themeColorTo",
        "themeTextColor" = EXCLUDED."themeTextColor",
        "themeBgColor" = EXCLUDED."themeBgColor",
        "updatedAt" = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
