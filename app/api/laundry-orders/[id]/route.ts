import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

async function dispatchToBitRide(orderId: string, trip: "pickup" | "return") {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://gruwcer.com"
  const res = await fetch(`${base}/api/laundry-delivery-bridge`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ orderId, trip }),
  })
  return res.json()
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()

  // If partner is accepting, save their lat/lng onto the order so BitRide knows shop location
  if (data.status === "accepted" && data.partnerLat && data.partnerLng) {
    await prisma.laundryOrder.update({
      where: { id },
      data: { partnerLat: data.partnerLat, partnerLng: data.partnerLng },
    })
    delete data.partnerLat
    delete data.partnerLng
  }

  const order = await prisma.laundryOrder.update({ where: { id }, data })

  // Auto-dispatch pickup trip to BitRide when shop accepts
  if (data.status === "accepted") {
    try {
      await dispatchToBitRide(id, "pickup")
    } catch (e) {
      console.error("BitRide pickup dispatch failed:", e)
    }
  }

  // Auto-dispatch return trip to BitRide when shop marks laundry ready
  if (data.status === "ready") {
    try {
      await dispatchToBitRide(id, "return")
    } catch (e) {
      console.error("BitRide return dispatch failed:", e)
    }
  }

  return NextResponse.json(order)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await prisma.laundryOrder.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
