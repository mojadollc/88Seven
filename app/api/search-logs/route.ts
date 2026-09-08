import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "SearchLog" (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `)
}

export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    const q = query?.trim().toLowerCase()
    if (!q || q.length < 2) return NextResponse.json({ ok: true })
    await ensureTable()
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    await prisma.$executeRawUnsafe(`INSERT INTO "SearchLog" (id, query) VALUES ($1, $2)`, id, q)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureTable()
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10")
    const rows = await prisma.$queryRawUnsafe<{ query: string; count: bigint }[]>(`
      SELECT query, COUNT(*) as count
      FROM "SearchLog"
      GROUP BY query
      ORDER BY count DESC
      LIMIT $1
    `, limit)
    return NextResponse.json(rows.map(r => ({ query: r.query, count: Number(r.count) })))
  } catch (e: any) {
    return NextResponse.json([], { status: 200 })
  }
}
