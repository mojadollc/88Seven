"use client"

import { useEffect, useState } from "react"

type LaundryOrder = {
  id: string
  serviceName: string
  weight: number
  price: number
  pickupFee: number
  deliveryFee: number
  totalPrice: number
  pickupAddress: string
  pickupLat?: number
  pickupLng?: number
  notes: string
  status: string
  customerId: string
  customerName: string
  customerPhone: string
  partnerId?: string
  partnerName?: string
  riderId?: string
  riderName?: string
  createdAt: any
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Waiting for Shop",
  accepted: "Shop Accepted — Needs Rider",
  rider_to_customer: "Rider → Customer (Pickup)",
  rider_picked_up: "Rider Has Laundry",
  rider_to_laundromat: "Rider → Shop",
  at_laundromat: "At Shop",
  washing: "Washing",
  ready: "Clean — Needs Return Rider",
  rider_return_pickup: "Rider → Shop (Return)",
  rider_returning: "Rider → Customer (Returning)",
  delivered: "Delivered",
  cancelled: "Cancelled",
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  rider_to_customer: "bg-cyan-100 text-cyan-800",
  rider_picked_up: "bg-cyan-100 text-cyan-800",
  rider_to_laundromat: "bg-teal-100 text-teal-800",
  at_laundromat: "bg-purple-100 text-purple-800",
  washing: "bg-indigo-100 text-indigo-800",
  ready: "bg-orange-100 text-orange-800",
  rider_return_pickup: "bg-teal-100 text-teal-800",
  rider_returning: "bg-cyan-100 text-cyan-800",
  delivered: "bg-[#59EBC6]/20 text-green-800",
  cancelled: "bg-[#59EBC6]/20 text-green-900",
}

const ALL_STATUSES = Object.keys(STATUS_LABELS)

type FilterTab = "needs_action" | "active" | "completed" | "all"

export default function AdminLaundryPage() {
  const [orders, setOrders] = useState<LaundryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<FilterTab>("needs_action")

  useEffect(() => {
    async function loadOrders() {
      const res = await fetch("/api/laundry-orders")
      if (res.ok) { const data = await res.json(); setOrders(data); setLoading(false) }
    }
    loadOrders()
    const interval = setInterval(loadOrders, 5000)
    return () => clearInterval(interval)
  }, [])

  const handleStatus = async (orderId: string, status: string) => {
    await fetch(`/api/laundry-orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
  }

  const handleReDispatch = async (orderId: string, trip: "pickup" | "return") => {
    const res = await fetch("/api/laundry-delivery-bridge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, trip }),
    })
    const data = await res.json()
    if (!res.ok) alert(`BitRide dispatch failed: ${data.error || "Unknown error"}`)
  }

  // Admin only needs to act on: accepted (assign pickup rider) and ready (assign return rider)
  const needsAction = orders.filter((o) => ["accepted", "ready"].includes(o.status))
  const active = orders.filter((o) => !["pending", "accepted", "ready", "delivered", "cancelled"].includes(o.status))
  const completed = orders.filter((o) => ["delivered", "cancelled"].includes(o.status))
  const filtered = tab === "needs_action" ? needsAction : tab === "active" ? active : tab === "completed" ? completed : orders

  const deliveredOrders = orders.filter((o) => o.status === "delivered")

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1F2937]">Laundry Orders</h1>
          {needsAction.length > 0 && <span className="bg-[#319F44]/100 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{needsAction.length} needs action</span>}
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-orange-600">{needsAction.length}</p>
            <p className="text-xs text-gray-400">Needs Action</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{active.length + orders.filter((o) => o.status === "pending").length}</p>
            <p className="text-xs text-gray-400">In Progress</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#319F44]">{deliveredOrders.length}</p>
            <p className="text-xs text-gray-400">Delivered</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#319F44]">₱{deliveredOrders.reduce((s, o) => s + (o.totalPrice || 0), 0).toFixed(0)}</p>
            <p className="text-xs text-gray-400">Revenue</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {([["needs_action", `Action (${needsAction.length})`], ["active", `Active (${active.length})`], ["completed", "Completed"], ["all", "All"]] as [FilterTab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-xs rounded-lg whitespace-nowrap font-medium transition-colors ${tab === key ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Orders */}
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <p className="text-gray-400 text-sm">No orders</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 8)}</span>
                  </div>
                  <span className="font-bold text-blue-600">₱{order.totalPrice || order.price}</span>
                </div>

                <div className="p-5">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-[10px] text-gray-400">Customer</p>
                      <p className="text-sm font-medium">{order.customerName}</p>
                      <p className="text-xs text-gray-400">{order.customerPhone}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Service</p>
                      <p className="text-sm font-medium">{order.serviceName} • {order.weight}kg</p>
                    </div>
                  </div>
                  <div className="mb-3">
                    <p className="text-[10px] text-gray-400">Pickup Address</p>
                    <p className="text-sm text-gray-700">{order.pickupAddress}</p>
                  </div>

                  {/* Assignments */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    {order.partnerName && <span className="text-[10px] bg-purple-50 text-purple-700 px-2 py-1 rounded-lg font-medium">🧺 {order.partnerName}</span>}
                    {order.riderName && <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-1 rounded-lg font-medium">🏍️ {order.riderName}</span>}
                  </div>

                  {/* Admin Actions */}
                  <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                    {/* ACCEPTED — BitRide auto-dispatched pickup, admin can re-dispatch if needed */}
                    {order.status === "accepted" && (
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-blue-600 font-medium flex-1">⚡ Dispatching pickup rider via BitRide...</span>
                        <button
                          onClick={() => handleReDispatch(order.id, "pickup")}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700"
                        >
                          🔄 Re-Dispatch
                        </button>
                      </div>
                    )}

                    {/* RIDER_TO_CUSTOMER — in transit to customer */}
                    {order.status === "rider_to_customer" && (
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-cyan-600 font-medium flex-1">🏍️ Rider heading to customer</span>
                        {order.riderName && <span className="text-[10px] bg-cyan-50 text-cyan-700 px-2 py-1 rounded-lg">{order.riderName}</span>}
                        <button onClick={() => handleReDispatch(order.id, "pickup")} className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg">Re-Dispatch</button>
                      </div>
                    )}

                    {/* READY — BitRide auto-dispatched return, admin can re-dispatch if needed */}
                    {order.status === "ready" && (
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-orange-600 font-medium flex-1">⚡ Dispatching return rider via BitRide...</span>
                        <button
                          onClick={() => handleReDispatch(order.id, "return")}
                          className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-orange-600"
                        >
                          🔄 Re-Dispatch
                        </button>
                      </div>
                    )}

                    {/* RIDER_RETURN_PICKUP — in transit back to customer */}
                    {order.status === "rider_return_pickup" && (
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-xs text-teal-600 font-medium flex-1">🏍️ Rider collecting clean laundry from shop</span>
                        {order.riderName && <span className="text-[10px] bg-teal-50 text-teal-700 px-2 py-1 rounded-lg">{order.riderName}</span>}
                        <button onClick={() => handleReDispatch(order.id, "return")} className="text-xs border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg">Re-Dispatch</button>
                      </div>
                    )}

                    {/* Other active states — manual override dropdown */}
                    {!["accepted", "ready", "rider_to_customer", "rider_return_pickup", "delivered", "cancelled"].includes(order.status) && (
                      <select value={order.status} onChange={(e) => handleStatus(order.id, e.target.value)} className="text-[10px] border border-gray-200 rounded-lg px-2 py-1.5 outline-none bg-white text-gray-500 ml-auto">
                        {ALL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
