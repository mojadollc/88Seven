import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { createHmac } from "crypto"

const BRIDGE_SECRET = process.env.DELIVERY_BRIDGE_SECRET!
const TAXI_DB_URL   = process.env.TAXI_FIREBASE_DB_URL!

function sign(payload: string) {
  return createHmac("sha256", BRIDGE_SECRET).update(payload).digest("hex")
}
function verifySignature(payload: string, sig: string) {
  return sign(payload) === sig
}

// BitRide status → laundry order status, keyed by trip type
const FB_STATUS_MAP: Record<"pickup" | "return", Record<string, string>> = {
  pickup: {
    ACCEPTED:  "rider_to_customer",
    STARTED:   "rider_picked_up",
    REACHED:   "rider_to_laundromat",
    COMPLETE:  "at_laundromat",
    CANCELLED: "accepted",           // back to accepted so admin/partner can re-dispatch
  },
  return: {
    ACCEPTED:  "rider_return_pickup",
    STARTED:   "rider_returning",
    REACHED:   "rider_returning",
    COMPLETE:  "delivered",
    CANCELLED: "ready",              // back to ready so partner can re-dispatch
  },
}

const CUSTOMER_MESSAGES: Record<string, [string, string]> = {
  rider_to_customer:   ["Rider On The Way 🏍️",    "Your rider is heading to your address to pick up your laundry"],
  rider_picked_up:     ["Laundry Picked Up 🧺",    "Your rider has collected your laundry and is heading to the shop"],
  rider_to_laundromat: ["Almost at the Shop 🚗",   "Your laundry is almost at the laundromat"],
  at_laundromat:       ["Laundry Received 🏪",     "The laundromat has received your laundry — washing will begin soon"],
  rider_return_pickup: ["Return Rider Assigned 🏍️","A rider is heading to the shop to collect your clean laundry"],
  rider_returning:     ["On the Way Back 🚀",       "Your clean laundry is on its way to you!"],
  delivered:           ["Laundry Delivered ✅",     "Your clean laundry has been delivered. Enjoy!"],
  accepted:            ["Rider Cancelled — Reassigning 🔄", "Your pickup rider cancelled. We are finding a new rider."],
  ready:               ["Rider Cancelled — Reassigning 🔄", "The return rider cancelled. We are finding a new rider."],
}

// ── GET: BitRide calls this when booking status changes ──────────────────────
export async function GET(req: NextRequest) {
  const orderId    = req.nextUrl.searchParams.get("orderId")
  const trip       = req.nextUrl.searchParams.get("trip") as "pickup" | "return" | null
  const fbStatus   = req.nextUrl.searchParams.get("status")
  const sig        = req.nextUrl.searchParams.get("sig")
  const driverName = req.nextUrl.searchParams.get("driverName") || ""
  const driverLat  = parseFloat(req.nextUrl.searchParams.get("driverLat") || "0")
  const driverLng  = parseFloat(req.nextUrl.searchParams.get("driverLng") || "0")

  if (!orderId || !trip || !fbStatus || !sig)
    return NextResponse.json({ error: "Missing params" }, { status: 400 })

  const payload = `${orderId}:${trip}:${fbStatus}`
  if (!verifySignature(payload, sig))
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })

  const statusMap = FB_STATUS_MAP[trip]
  if (!statusMap) return NextResponse.json({ error: "Unknown trip type" }, { status: 400 })

  const newStatus = statusMap[fbStatus]
  if (!newStatus) return NextResponse.json({ error: "Unknown status" }, { status: 400 })

  const updateData: any = { status: newStatus }
  if (driverName) updateData.riderName = driverName
  if (driverLat)  updateData.riderLat  = driverLat
  if (driverLng)  updateData.riderLng  = driverLng
  if (newStatus === "delivered") updateData.deliveredAt = new Date()

  const order = await prisma.laundryOrder.update({ where: { id: orderId }, data: updateData })

  const msg = CUSTOMER_MESSAGES[newStatus]
  if (msg) {
    await prisma.notification.create({
      data: {
        recipientType: "customer",
        recipientId:   order.customerId,
        title:         msg[0],
        message:       msg[1],
      },
    })
  }

  return NextResponse.json({ success: true, status: newStatus })
}

// ── POST: Push a laundry trip booking to BitRide ─────────────────────────────
export async function POST(req: NextRequest) {
  const { orderId, trip } = await req.json() as { orderId: string; trip: "pickup" | "return" }
  if (!orderId || !trip)
    return NextResponse.json({ error: "orderId and trip required" }, { status: 400 })

  const order = await prisma.laundryOrder.findUnique({ where: { id: orderId } }) as any
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 })

  const callbackBase = process.env.NEXT_PUBLIC_APP_URL || "https://gruwcer.com"
  const sig = sign(`${orderId}:${trip}:CALLBACK_INIT`)

  let fbBooking: any

  if (trip === "pickup") {
    // Rider goes FROM customer TO laundromat
    if (!order.pickupLat || !order.pickupLng)
      return NextResponse.json({ error: "Customer location not set on order" }, { status: 400 })
    if (!order.partnerLat || !order.partnerLng)
      return NextResponse.json({ error: "Partner shop location not set — partner must save their GPS in Shop settings" }, { status: 400 })

    fbBooking = {
      serviceType:      "delivery",
      status:           "NEW",
      bookLater:        false,
      bookingDate:      Date.now(),
      tripdate:         Date.now(),
      booking_from_web: true,
      pickup: { add: order.pickupAddress, lat: order.pickupLat, lng: order.pickupLng },
      drop:   { add: order.partnerName || "Laundromat", lat: order.partnerLat, lng: order.partnerLng },
      customer_name:    order.customerName,
      customer_contact: order.customerPhone,
      tripInstructions: `🧺 Laundry Pickup #${order.id.slice(0, 8)} | ${order.serviceName} ${order.weight}kg | Collect from customer, deliver to ${order.partnerName}`,
      callbackUrl:      `${callbackBase}/api/laundry-delivery-bridge?orderId=${orderId}&trip=pickup&sig=${sig}`,
      gruwcerOrderId:   orderId,
      payment_mode:     "cash",
      trip_cost:        order.deliveryFee,
    }
  } else {
    // Return: rider goes FROM laundromat BACK TO customer
    if (!order.partnerLat || !order.partnerLng)
      return NextResponse.json({ error: "Partner shop location not set" }, { status: 400 })
    if (!order.pickupLat || !order.pickupLng)
      return NextResponse.json({ error: "Customer location not set" }, { status: 400 })

    fbBooking = {
      serviceType:      "delivery",
      status:           "NEW",
      bookLater:        false,
      bookingDate:      Date.now(),
      tripdate:         Date.now(),
      booking_from_web: true,
      pickup: { add: order.partnerName || "Laundromat", lat: order.partnerLat, lng: order.partnerLng },
      drop:   { add: order.pickupAddress, lat: order.pickupLat, lng: order.pickupLng },
      customer_name:    order.customerName,
      customer_contact: order.customerPhone,
      tripInstructions: `🧺 Laundry Return #${order.id.slice(0, 8)} | ${order.serviceName} ${order.weight}kg | Collect CLEAN laundry from ${order.partnerName}, deliver to customer`,
      callbackUrl:      `${callbackBase}/api/laundry-delivery-bridge?orderId=${orderId}&trip=return&sig=${sig}`,
      gruwcerOrderId:   orderId,
      payment_mode:     "cash",
      trip_cost:        order.deliveryFee,
    }
  }

  const fbRes = await fetch(`${TAXI_DB_URL}/bookings.json`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(fbBooking),
  })

  if (!fbRes.ok) {
    const err = await fbRes.text()
    return NextResponse.json({ error: "BitRide push failed", detail: err }, { status: 500 })
  }

  const { name: fbBookingId } = await fbRes.json()

  // Save the BitRide booking ID on the order
  const updateField = trip === "pickup"
    ? { fbPickupBookingId: fbBookingId, status: "rider_to_customer" }
    : { fbReturnBookingId: fbBookingId, status: "rider_return_pickup" }

  await prisma.laundryOrder.update({ where: { id: orderId }, data: updateField })

  return NextResponse.json({ success: true, fbBookingId })
}
