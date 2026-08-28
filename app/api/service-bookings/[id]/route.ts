import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const booking = await prisma.serviceBooking.update({ where: { id }, data })
  return NextResponse.json(booking)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.serviceBooking.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
