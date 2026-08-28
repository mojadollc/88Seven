import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const promos = await prisma.platformPromo.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(promos)
}

export async function POST(req: Request) {
  const data = await req.json()
  const promo = await prisma.platformPromo.create({ data })
  return NextResponse.json(promo)
}
