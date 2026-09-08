import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createHmac } from "crypto"

const BRIDGE_SECRET = process.env.DELIVERY_BRIDGE_SECRET!
const TAXI_DB_URL = process.env.TAXI_FIREBASE_DB_URL!

// ── Status map: Firebase booking status → 88-seven order status ──────────────
const FB_TO_ORDER_STATUS: Record<string, string> = {
  ACCEPTED:  "rider_accepted",
  STARTED:   "rider_picked_up",
  REACHED:   "out_for_delivery",
  COMPLETE:  "delivered",
  CANCELLED: "cancelled",
}

function sign(payload: string) {
  return createHmac("sha256", BRIDGE_SECRET).update(payload).digest("hex")
}

function verifySignature(payload: string, sig: string) {
  return sign(payload) === sig
}

// ── GET: Firebase Cloud Function calls this to sync status back ───────────────
export async function GET(req: NextRequest) {
  const orderId  = req.nextUrl.searchParams.get("orderId")
  const fbStatus = req.nextUrl.searchParams.get("status")
  const sig      = req.nextUrl.searchParams.get("sig")
  const driverName = req.nextUrl.searchParams.get("driverName") || ""
  const driverLat  = parseFloat(req.nextUrl.searchParams.get("driverLat") || "0")
  const driverLng  = parseFloat(req.nextUrl.searchParams.get("driverLng") || "0")

  if (!orderId || !fbStatus || !sig) return NextResponse.json({ error: "Missing params" }, { status: 400 })

  const payload = `${orderId}:${fbStatus}`
  if (!verifySignature(payload, sig)) return NextResponse.json({ error: "Invalid signature" }, { status: 401 })

  const newStatus = FB_TO_ORDER_STATUS[fbStatus]
  if (!newStatus) return NextResponse.json({ error: "Unknown status" }, { status: 400 })

  const updateData: any = { status: newStatus }
  if (driverName) updateData.driverName = driverName
  if (driverLat)  updateData.driverLat  = driverLat
  if (driverLng)  updateData.driverLng  = driverLng
  if (newStatus === "rider_picked_up") updateData.pickedUpAt = new Date()
  if (newStatus === "delivered")       updateData.deliveredAt = new Date()

  const order = await prisma.order.update({ where: { id: orderId }, data: updateData })

  // Notify customer
  const statusMessages: Record<string, [string, string]> = {
    rider_accepted:  ["Rider Assigned 🏍️",    "Your rider is on the way to pick up your order"],
    rider_picked_up: ["Order Picked Up 📦",    "Your rider has picked up your order and is heading to you"],
    out_for_delivery:["Out for Delivery 🚀",   "Your order is almost there!"],
    delivered:       ["Order Delivered ✅",    "Your order has been delivered. Enjoy!"],
    cancelled:       ["Order Cancelled",       "Your delivery was cancelled. Please contact support."],
  }
  const msg = statusMessages[newStatus]
  if (msg && order.customerId) {
    await prisma.notification.create({
      data: { recipientType: "customer", recipientId: order.customerId, title: msg[0], message: msg[1], orderId: order.id }
    })
  }

  return NextResponse.json({ success: true, status: newStatus })
}

// ── POST: Push a grocery order as a delivery booking to Firebase ──────────────
export async function POST(req: NextRequest) {
  const { orderId } = await req.json()
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 })

  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } })
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const settings = await prisma.deliverySettings.findFirst()
  if (!settings || !settings.storeLat || !settings.storeLng) {
    return NextResponse.json({ error: "Store location not configured in Settings" }, { status: 400 })
  }

  const itemsSummary = order.items.map(i => `${i.name} x${i.quantity}`).join(", ")
  const callbackBase = process.env.NEXT_PUBLIC_APP_URL || "https://gruwcer.com"

  // Build the Firebase booking object (matches taxi app schema)
  const fbBooking = {
    serviceType:      "delivery",
    status:           "NEW",
    bookLater:        false,
    bookingDate:      new Date().getTime(),
    tripdate:         new Date().getTime(),
    booking_from_web: true,
    // Pickup = store
    pickup: {
      add:    settings.freeDeliveryArea || "Store",
      lat:    settings.storeLat,
      lng:    settings.storeLng,
    },
    // Drop = customer
    drop: {
      add:    order.deliveryAddress,
      lat:    order.deliveryLat  || 0,
      lng:    order.deliveryLng  || 0,
    },
    customer_name:    order.customerName,
    customer_contact: order.customerPhone,
    // Notes visible to driver
    tripInstructions: `📦 Gruwcer Order #${order.id.slice(0, 8)} | ${itemsSummary} | Total: ₱${order.total}`,
    // Callback URL signed with HMAC so Firebase can notify us
    callbackUrl:      `${callbackBase}/api/delivery-bridge`,
    callbackSecret:   sign(`${orderId}:CALLBACK_INIT`),
    gruwcerOrderId:   orderId,
    payment_mode:     order.paymentMethod === "cod" ? "cash" : "wallet",
    trip_cost:        order.total,
  }

  // Push to Firebase RTDB using REST API
  const fbRes = await fetch(`${TAXI_DB_URL}/bookings.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fbBooking),
  })

  if (!fbRes.ok) {
    const err = await fbRes.text()
    return NextResponse.json({ error: "Firebase push failed", detail: err }, { status: 500 })
  }

  const { name: fbBookingId } = await fbRes.json()

  // Store the Firebase booking ID on the order for tracking
  await prisma.order.update({
    where: { id: orderId },
    data: { notes: order.notes ? `${order.notes} | FB:${fbBookingId}` : `FB:${fbBookingId}` }
  })

  return NextResponse.json({ success: true, fbBookingId })
}
