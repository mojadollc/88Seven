import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const slide = await prisma.heroSlide.update({ where: { id }, data })
  return NextResponse.json(slide)
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.heroSlide.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
