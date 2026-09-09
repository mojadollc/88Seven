"use client"

import { useEffect, useState } from "react"

export default function BitRideDeliveriesPage() {
  const [groceryOrders, setGroceryOrders] = useState<any[]>([])
  const [laundryOrders, setLaundryOrders] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"grocery" | "laundry">("grocery")

  useEffect(() => {
    async function load() {
      const [grocery, laundry, s] = await Promise.all([
        fetch("/api/orders").then(r => r.json()),
        fetch("/api/laundry-orders").then(r => r.json()),
        fetch("/api/delivery-settings").then(r => r.json()),
      ])
      setGroceryOrders(Array.isArray(grocery) ? grocery : [])
      setLaundryOrders(Array.isArray(laundry) ? laundry : [])
      setSettings(s)
      setLoading(false)
    }
    load()
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [])

  // Only orders that were dispatched to BitRide (have notes with FB: or have rider-related statuses)
  const dispatchedGrocery = groceryOrders.filter(o =>
    o.notes?.includes("FB:") ||
    ["rider_accepted","rider_at_store","rider_picked_up","out_for_delivery","delivered"].includes(o.status)
  )
  const dispatchedLaundry = laundryOrders.filter(o =>
    o.fbPickupBookingId || o.fbReturnBookingId ||
    ["rider_to_customer","rider_picked_up","rider_to_laundromat","at_laundromat",
     "rider_return_pickup","rider_returning","delivered"].includes(o.status)
  )

  const deliveredGrocery = dispatchedGrocery.filter(o => o.status === "delivered")
  const deliveredLaundry = dispatchedLaundry.filter(o => o.status === "delivered")

  // Delivery fee = what customer paid for delivery (goes to BitRide)
  const groceryDeliveryRevenue = deliveredGrocery.reduce((s, o) => {
    const fee = settings?.groceryBaseFare || 39
    return s + fee
  }, 0)
  const laundryDeliveryRevenue = deliveredLaundry.reduce((s, o) => {
    return s + (o.deliveryFee || 0) * 2 // pickup + return
  }, 0)
  const totalBitRidePayable = groceryDeliveryRevenue + laundryDeliveryRevenue

  const STATUS_COLOR: Record<string, string> = {
    rider_accepted:    "bg-cyan-100 text-cyan-700",
    rider_at_store:    "bg-teal-100 text-teal-700",
    rider_picked_up:   "bg-blue-100 text-blue-700",
    out_for_delivery:  "bg-indigo-100 text-indigo-700",
    delivered:         "bg-green-100 text-green-700",
    rider_to_customer: "bg-cyan-100 text-cyan-700",
    rider_to_laundromat:"bg-teal-100 text-teal-700",
    at_laundromat:     "bg-purple-100 text-purple-700",
    rider_return_pickup:"bg-teal-100 text-teal-700",
    rider_returning:   "bg-blue-100 text-blue-700",
    cancelled:         "bg-gray-100 text-gray-500",
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1F2937]">BitRide Deliveries</h1>
            <p className="text-xs text-gray-400 mt-0.5">All riders are managed in BitRide — this shows orders dispatched via BitRide</p>
          </div>
          <a
            href="https://bitride-41c11.web.app/"
            target="_blank"
            className="text-xs bg-[#1F2937] text-white px-4 py-2 rounded-lg font-bold hover:bg-black flex items-center gap-1.5"
          >
            Open BitRide ↗
          </a>
        </div>
      </header>

      <div className="p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{dispatchedGrocery.length + dispatchedLaundry.length}</p>
            <p className="text-xs text-gray-400">Total Dispatched</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#319F44]">{deliveredGrocery.length + deliveredLaundry.length}</p>
            <p className="text-xs text-gray-400">Completed</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-orange-500">
              {dispatchedGrocery.filter(o => !["delivered","cancelled"].includes(o.status)).length +
               dispatchedLaundry.filter(o => !["delivered","cancelled"].includes(o.status)).length}
            </p>
            <p className="text-xs text-gray-400">In Progress</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#1F2937]">₱{totalBitRidePayable.toFixed(0)}</p>
            <p className="text-xs text-gray-400">Delivery Fees Collected</p>
          </div>
        </div>

        {/* BitRide Info Banner */}
        <div className="bg-[#1F2937] rounded-xl p-4 mb-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 text-xl">🏍️</div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">Rider Management is in BitRide</p>
            <p className="text-white/60 text-xs mt-1">
              All rider registration, wallet top-ups, commission deductions, and earnings are handled
              inside the BitRide platform at <span className="text-white font-mono">bitride-41c11.web.app</span>.
              Gruwcer only pushes bookings to BitRide and receives status callbacks.
            </p>
          </div>
          <a href="https://bitride-41c11.web.app/" target="_blank"
            className="shrink-0 text-[10px] bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg font-bold transition-colors">
            Manage Riders ↗
          </a>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {(["grocery", "laundry"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2 text-xs rounded-lg font-medium capitalize transition-colors ${tab === t ? "bg-[#319F44] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
              {t === "grocery" ? `🛒 Grocery (${dispatchedGrocery.length})` : `🧺 Laundry (${dispatchedLaundry.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : (
          <div className="space-y-3">
            {(tab === "grocery" ? dispatchedGrocery : dispatchedLaundry).length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <p className="text-4xl mb-3">📭</p>
                <p className="text-gray-400 text-sm">No BitRide dispatches yet</p>
              </div>
            ) : (tab === "grocery" ? dispatchedGrocery : dispatchedLaundry).map((order: any) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLOR[order.status] || "bg-gray-100 text-gray-500"}`}>
                      {order.status.replace(/_/g, " ")}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 8)}</span>
                    {/* BitRide booking ID */}
                    {(order.notes?.match(/FB:(\S+)/)?.[1] || order.fbPickupBookingId) && (
                      <span className="text-[9px] bg-[#1F2937] text-white px-2 py-0.5 rounded font-mono">
                        BitRide: {order.notes?.match(/FB:(\S+)/)?.[1] || order.fbPickupBookingId}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {order.riderName && (
                      <span className="text-[10px] text-gray-500">🏍️ {order.riderName}</span>
                    )}
                    <span className="font-bold text-[#319F44] text-sm">
                      ₱{(order.total || order.totalPrice || 0).toFixed(0)}
                    </span>
                  </div>
                </div>
                <div className="px-5 py-3 grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-gray-400">Customer</p>
                    <p className="font-medium text-gray-800">{order.customerName}</p>
                    <p className="text-gray-400">{order.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Address</p>
                    <p className="text-gray-700 line-clamp-2">{order.deliveryAddress || order.pickupAddress}</p>
                  </div>
                  {tab === "laundry" && (
                    <>
                      <div>
                        <p className="text-gray-400">Service</p>
                        <p className="font-medium text-gray-800">{order.serviceName} · {order.weight}kg</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Delivery Fee (×2 trips)</p>
                        <p className="font-bold text-blue-600">₱{((order.deliveryFee || 0) * 2).toFixed(0)}</p>
                      </div>
                    </>
                  )}
                  {tab === "grocery" && (
                    <div>
                      <p className="text-gray-400">Delivery Fee</p>
                      <p className="font-bold text-blue-600">₱{settings?.groceryBaseFare || 39}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
