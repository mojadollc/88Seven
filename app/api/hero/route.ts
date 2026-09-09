import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all")
  const page = req.nextUrl.searchParams.get("page")
  try {
    const where: any = {}
    if (!all) where.enabled = true
    if (page) where.page = page
    const slides = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM "HeroSlide"
       WHERE ${!all ? '"enabled" = true AND ' : ''}${page ? `"page" = '${page.replace(/'/g, "''")}' AND ` : ''}1=1
       ORDER BY "order" ASC`
    )
    return NextResponse.json(slides)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const d = await req.json()
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const now = new Date().toISOString()
    await prisma.$executeRawUnsafe(
      `INSERT INTO "HeroSlide" (id, page, badge, title, highlight, description, "imageUrl", "bgColor", link, "order", enabled, "createdAt", "updatedAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      id, d.page ?? 'grocery', d.badge ?? '', d.title ?? '', d.highlight ?? '',
      d.description ?? '', d.imageUrl ?? '', d.bgColor ?? '#319F44',
      d.link ?? '', d.order ?? 0, d.enabled ?? true, now, now
    )
    const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "HeroSlide" WHERE id = $1`, id)
    return NextResponse.json(rows[0])
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
