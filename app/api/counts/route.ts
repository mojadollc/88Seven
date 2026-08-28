import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type")

  if (type === "grocery") {
    const count = await prisma.order.count({ where: { status: { in: ["pending", "confirmed", "preparing", "ready_for_pickup"] } } })
    return NextResponse.json({ count })
  }
  if (type === "laundry") {
    const count = await prisma.laundryOrder.count({ where: { status: { in: ["pending", "accepted", "ready"] } } })
    return NextResponse.json({ count })
  }
  if (type === "partners") {
    const count = await prisma.user.count({ where: { role: "partner", status: "pending" } })
    return NextResponse.json({ count })
  }
  if (type === "riders") {
    const count = await prisma.user.count({ where: { role: "driver", status: "pending" } })
    return NextResponse.json({ count })
  }

  return NextResponse.json({ count: 0 })
}
