import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const DEFAULTS = {
  themeType: "solid",
  themeColor: "#319F44",
  themeColorTo: "#59EBC6",
  themeTextColor: "#ffffff",
  themeBgColor: "#F5F5DB",
  themeDeliveryBannerColor: "#267a34",
  themeDeliveryBannerTextColor: "#ffffff",
  themeFooterBgColor: "#1a1a1a",
  themeFooterTextColor: "#ffffff",
}

const MIGRATE = `
  ALTER TABLE "AppSettings"
    ADD COLUMN IF NOT EXISTS "themeType" TEXT NOT NULL DEFAULT 'solid',
    ADD COLUMN IF NOT EXISTS "themeColor" TEXT NOT NULL DEFAULT '#319F44',
    ADD COLUMN IF NOT EXISTS "themeColorTo" TEXT NOT NULL DEFAULT '#59EBC6',
    ADD COLUMN IF NOT EXISTS "themeTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS "themeBgColor" TEXT NOT NULL DEFAULT '#F5F5DB',
    ADD COLUMN IF NOT EXISTS "themeDeliveryBannerColor" TEXT NOT NULL DEFAULT '#267a34',
    ADD COLUMN IF NOT EXISTS "themeDeliveryBannerTextColor" TEXT NOT NULL DEFAULT '#ffffff',
    ADD COLUMN IF NOT EXISTS "themeFooterBgColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    ADD COLUMN IF NOT EXISTS "themeFooterTextColor" TEXT NOT NULL DEFAULT '#ffffff'
`

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await (prisma as any).$executeRawUnsafe(MIGRATE)
    const rows = await (prisma as any).$queryRaw`
      SELECT "themeType", "themeColor", "themeColorTo", "themeTextColor", "themeBgColor", "themeDeliveryBannerColor", "themeDeliveryBannerTextColor", "themeFooterBgColor", "themeFooterTextColor"
      FROM "AppSettings" WHERE key = 'global' LIMIT 1
    `
    const row = Array.isArray(rows) ? rows[0] : null
    return NextResponse.json({
      themeType: row?.themeType ?? DEFAULTS.themeType,
      themeColor: row?.themeColor ?? DEFAULTS.themeColor,
      themeColorTo: row?.themeColorTo ?? DEFAULTS.themeColorTo,
      themeTextColor: row?.themeTextColor ?? DEFAULTS.themeTextColor,
      themeBgColor: row?.themeBgColor ?? DEFAULTS.themeBgColor,
      themeDeliveryBannerColor: row?.themeDeliveryBannerColor ?? DEFAULTS.themeDeliveryBannerColor,
      themeDeliveryBannerTextColor: row?.themeDeliveryBannerTextColor ?? DEFAULTS.themeDeliveryBannerTextColor,
      themeFooterBgColor: row?.themeFooterBgColor ?? DEFAULTS.themeFooterBgColor,
      themeFooterTextColor: row?.themeFooterTextColor ?? DEFAULTS.themeFooterTextColor,
    }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } })
  } catch {
    return NextResponse.json(DEFAULTS, { headers: { "Cache-Control": "no-store" } })
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { themeType, themeColor, themeColorTo, themeTextColor, themeBgColor, themeDeliveryBannerColor, themeDeliveryBannerTextColor, themeFooterBgColor, themeFooterTextColor } = body

    await (prisma as any).$executeRawUnsafe(MIGRATE)

    await (prisma as any).$executeRaw`
      INSERT INTO "AppSettings" (id, key, "themeType", "themeColor", "themeColorTo", "themeTextColor", "themeBgColor", "themeDeliveryBannerColor", "themeDeliveryBannerTextColor", "themeFooterBgColor", "themeFooterTextColor", "updatedAt")
      VALUES (gen_random_uuid(), 'global', ${themeType}, ${themeColor}, ${themeColorTo}, ${themeTextColor}, ${themeBgColor}, ${themeDeliveryBannerColor ?? DEFAULTS.themeDeliveryBannerColor}, ${themeDeliveryBannerTextColor ?? DEFAULTS.themeDeliveryBannerTextColor}, ${themeFooterBgColor ?? DEFAULTS.themeFooterBgColor}, ${themeFooterTextColor ?? DEFAULTS.themeFooterTextColor}, NOW())
      ON CONFLICT (key) DO UPDATE SET
        "themeType" = EXCLUDED."themeType",
        "themeColor" = EXCLUDED."themeColor",
        "themeColorTo" = EXCLUDED."themeColorTo",
        "themeTextColor" = EXCLUDED."themeTextColor",
        "themeBgColor" = EXCLUDED."themeBgColor",
        "themeDeliveryBannerColor" = EXCLUDED."themeDeliveryBannerColor",
        "themeDeliveryBannerTextColor" = EXCLUDED."themeDeliveryBannerTextColor",
        "themeFooterBgColor" = EXCLUDED."themeFooterBgColor",
        "themeFooterTextColor" = EXCLUDED."themeFooterTextColor",
        "updatedAt" = NOW()
    `

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
