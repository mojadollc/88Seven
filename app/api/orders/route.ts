import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId")
  const driverId = req.nextUrl.searchParams.get("driverId")
  const status = req.nextUrl.searchParams.get("status")
  const where: any = {}
  if (customerId) where.customerId = customerId
  if (driverId) where.driverId = driverId
  if (status) where.status = status
  const orders = await prisma.order.findMany({
    where,
    include: { items: true },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(orders)
}

export async function POST(req: NextRequest) {
  const { items, ...data } = await req.json()
  const order = await prisma.order.create({
    data: {
      ...data,
      items: { create: items.map((i: any) => ({ ...i, productId: i.productId || null })) },
    },
    include: { items: true },
  })
  // Notify admin
  await prisma.notification.create({
    data: {
      recipientType: "admin",
      title: "New Order!",
      message: `${data.customerName} placed a new order`,
      orderId: order.id,
    }
  })
  return NextResponse.json(order)
}
