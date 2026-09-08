import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  // If items are being updated, handle separately
  if (body.items) {
    const { items, total, notes } = body
    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } })
      await tx.orderItem.createMany({ data: items.map((i: any) => ({ ...i, orderId: id, productId: i.productId || null })) })
      await tx.order.update({ where: { id }, data: { total, notes } })
    })
  } else {
    await prisma.order.update({ where: { id }, data: body })
    // Auto-push to taxi delivery app when order is ready for pickup
    if (body.status === "ready_for_pickup") {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
        await fetch(`${baseUrl}/api/delivery-bridge`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: id }),
        })
      } catch (e) {
        // Non-blocking — order status already saved
        console.error("[delivery-bridge] auto-push failed:", e)
      }
    }
  }
  return NextResponse.json({ success: true })
}
