import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const banners = await prisma.appBanner.findMany({ orderBy: { order: "asc" } })
  return NextResponse.json(banners)
}

export async function POST(req: Request) {
  const data = await req.json()
  const banner = await prisma.appBanner.create({ data })
  return NextResponse.json(banner)
}
