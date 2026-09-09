import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const d = await req.json()
  const now = new Date().toISOString()
  const fields = Object.keys(d)
  if (fields.length === 0) return NextResponse.json({ error: "No fields" }, { status: 400 })
  const setClauses = fields.map((k, i) => `"${k}" = $${i + 2}`).join(", ")
  const values = fields.map(k => d[k])
  await prisma.$executeRawUnsafe(
    `UPDATE "HeroSlide" SET ${setClauses}, "updatedAt" = '${now}' WHERE id = $1`,
    id, ...values
  )
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM "HeroSlide" WHERE id = $1`, id)
  return NextResponse.json(rows[0])
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.$executeRawUnsafe(`DELETE FROM "HeroSlide" WHERE id = $1`, id)
  return NextResponse.json({ success: true })
}
