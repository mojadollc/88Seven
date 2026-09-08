import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// POST — log a search query
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json()
    const q = query?.trim().toLowerCase()
    if (!q || q.length < 2) return NextResponse.json({ ok: true })
    await prisma.searchLog.create({ data: { query: q } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET — return top searched terms (aggregated count)
export async function GET(req: NextRequest) {
  try {
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "10")
    const rows = await prisma.$queryRaw<{ query: string; count: bigint }[]>`
      SELECT query, COUNT(*) as count
      FROM "SearchLog"
      GROUP BY query
      ORDER BY count DESC
      LIMIT ${limit}
    `
    return NextResponse.json(rows.map(r => ({ query: r.query, count: Number(r.count) })))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
