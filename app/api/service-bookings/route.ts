import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const customerId = req.nextUrl.searchParams.get("customerId")
  const providerId = req.nextUrl.searchParams.get("providerId")
  const active = req.nextUrl.searchParams.get("active")
  const where: any = {}
  if (customerId) where.customerId = customerId
  if (providerId) where.providerId = providerId
  if (active === "true") where.active = true
  const bookings = await prisma.serviceBooking.findMany({ where, orderBy: { createdAt: "desc" } })
  return NextResponse.json(bookings)
}

export async function POST(req: Request) {
  const data = await req.json()
  const booking = await prisma.serviceBooking.create({ data })
  return NextResponse.json(booking)
}
