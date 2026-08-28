import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId")
  const riderId = req.nextUrl.searchParams.get("riderId")
  const partnerId = req.nextUrl.searchParams.get("partnerId")
  const where: any = {}
  if (customerId) where.customerId = customerId
  if (riderId) where.riderId = riderId
  if (partnerId) where.partnerId = partnerId
  const orders = await prisma.laundryOrder.findMany({ where, orderBy: { createdAt: "desc" } })
  return NextResponse.json(orders)
}

export async function POST(req: Request) {
  const data = await req.json()
  const order = await prisma.laundryOrder.create({ data })
  return NextResponse.json(order)
}
