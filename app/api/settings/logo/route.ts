import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE "AppSettings"
        ADD COLUMN IF NOT EXISTS "logoUrl" TEXT NOT NULL DEFAULT ''
    `)
    const rows = await (prisma as any).$queryRaw`
      SELECT "logoUrl" FROM "AppSettings" WHERE key = 'global' LIMIT 1
    `
    const row = Array.isArray(rows) ? rows[0] : null
    return NextResponse.json({ logoUrl: row?.logoUrl ?? "" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } })
  } catch {
    return NextResponse.json({ logoUrl: "" }, { headers: { "Cache-Control": "no-store" } })
  }
}

export async function POST(req: Request) {
  try {
    const { logoUrl } = await req.json()
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE "AppSettings"
        ADD COLUMN IF NOT EXISTS "logoUrl" TEXT NOT NULL DEFAULT ''
    `)
    await (prisma as any).$executeRaw`
      INSERT INTO "AppSettings" (id, key, "logoUrl", "updatedAt")
      VALUES (gen_random_uuid(), 'global', ${logoUrl}, NOW())
      ON CONFLICT (key) DO UPDATE SET "logoUrl" = EXCLUDED."logoUrl", "updatedAt" = NOW()
    `
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
