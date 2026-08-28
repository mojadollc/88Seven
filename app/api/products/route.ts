import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const all = req.nextUrl.searchParams.get("all")
  const products = await prisma.product.findMany({
    where: all ? {} : { showOnSite: true },
    orderBy: { name: "asc" },
  })
  return NextResponse.json(products)
}

export async function POST(req: NextRequest) {
  const data = await req.json()
  const product = await prisma.product.create({ data })
  return NextResponse.json(product)
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })
  await prisma.product.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
