import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const banners = await prisma.popupBanner.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(banners)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const banner = await prisma.popupBanner.create({ data })
  return NextResponse.json(banner)
}

export async function PATCH(req: NextRequest) {
  const { id, ...data } = await req.json()
  const banner = await prisma.popupBanner.update({ where: { id }, data })
  return NextResponse.json(banner)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  await prisma.popupBanner.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
