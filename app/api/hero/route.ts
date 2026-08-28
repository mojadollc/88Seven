import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all")
  const slides = await prisma.heroSlide.findMany({
    where: all ? {} : { enabled: true },
    orderBy: { order: "asc" },
  })
  return NextResponse.json(slides)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const slide = await prisma.heroSlide.create({ data })
  return NextResponse.json(slide)
}
