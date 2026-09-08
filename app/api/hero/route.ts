import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all")
  const page = req.nextUrl.searchParams.get("page")
  try {
    const slides = await prisma.heroSlide.findMany({
      where: {
        ...(all ? {} : { enabled: true }),
        ...(page ? { page } : {}),
      },
      orderBy: { order: "asc" },
    })
    return NextResponse.json(slides)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const slide = await prisma.heroSlide.create({ data })
    return NextResponse.json(slide)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
