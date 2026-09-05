"use client"

import { useEffect, useState, useRef } from "react"
import { getUser, clearAuth, getToken } from "@/lib/auth"
import { useNotificationSound } from "@/app/components/useNotificationSound"


type LaundryOrder = {
  id: string
  serviceName: string
  weight: number
  totalPrice: number
  pickupAddress: string
  partnerName: string
  status: string
  createdAt: any
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  rider_accepted: "bg-cyan-100 text-cyan-800",
  rider_at_store: "bg-teal-100 text-teal-800",
  rider_picked_up: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-[#93D569]/20 text-green-800",
  cancelled: "bg-[#93D569]/20 text-green-900",
  rejected: "bg-[#93D569]/20 text-green-900",
  accepted: "bg-blue-100 text-blue-800",
  at_laundromat: "bg-purple-100 text-purple-800",
  washing: "bg-indigo-100 text-indigo-800",
  ready: "bg-orange-100 text-orange-800",
  rider_returning: "bg-teal-100 text-teal-800",
  awaiting_payment: "bg-orange-100 text-orange-800",
}

export default function AccountPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [groceryOrders, setGroceryOrders] = useState<any[]>([])
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"orders" | "profile">("orders")
  const [orderFilter, setOrderFilter] = useState<"active" | "completed" | "all">("active")
  const playSound = useNotificationSound()
  const prevLaundryStatuses = useRef<Record<string, string>>({})

  useEffect(() => {
    const u = getUser()
    if (!u) { setLoading(false); return }
    if (u.role === "partner") { window.location.href = "/partner"; return }
    if (u.role === "driver") { window.location.href = "/driver"; return }
    if (u.role === "provider") { window.location.href = "/provider"; return }
    setUser(u)
    const token = getToken()
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(p => { if (p) { setProfile(p); setWalletBalance(p.walletBalance || 0) } })
    fetch(`/api/orders?customerId=${u.id}`)
      .then(r => r.ok ? r.json() : []).then(setGroceryOrders)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return
    const iv = setInterval(async () => {
      const r = await fetch(`/api/laundry-orders?customerId=${user.id}`)
      if (r.ok) {
        const orders = await r.json()
        let changed = false
        orders.forEach((o: any) => {
          const prev = prevLaundryStatuses.current[o.id]
          if (prev && prev !== o.status) changed = true
        })
        if (changed && Object.keys(prevLaundryStatuses.current).length > 0) playSound()
        const newStatuses: Record<string, string> = {}
        orders.forEach((o: any) => { newStatuses[o.id] = o.status })
        prevLaundryStatuses.current = newStatuses
        setLaundryOrders(orders)
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [user, playSound])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-[#4194AF] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="min-h-screen bg-gradient-to-b from-[#4194AF] to-[#3a7d96] flex items-center justify-center p-4">
      <div className="text-center w-full max-w-sm">
        <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <h2 className="font-bold text-2xl text-white mb-2">Welcome to Gruwcer</h2>
        <p className="text-white/60 text-sm mb-8">Sign in to manage orders, wallet & more</p>
        <a href="/auth?redirect=/account" className="block w-full bg-white text-[#4194AF] px-6 py-3.5 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors shadow-lg">
          Sign In / Create Account
        </a>
        <a href="/" className="block mt-4 text-white/50 text-xs hover:text-white">← Back to Home</a>
      </div>
    </div>
  )

  const activeGrocery = groceryOrders.filter((o) => !["delivered", "cancelled", "rejected"].includes(o.status))
  const activeLaundry = laundryOrders.filter((o) => !["delivered", "cancelled"].includes(o.status))
  const totalActive = activeGrocery.length + activeLaundry.length
  const totalOrders = groceryOrders.length + laundryOrders.length
  const totalSpent = groceryOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0) + laundryOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.totalPrice, 0)

  const getFilteredOrders = () => {
    const allOrders = [
      ...groceryOrders.map((o) => ({ ...o, type: "grocery" as const, amount: o.total })),
      ...laundryOrders.map((o) => ({ ...o, type: "laundry" as const, amount: o.totalPrice, total: o.totalPrice, items: [] as any[] })),
    ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())

    if (orderFilter === "active") return allOrders.filter((o) => !["delivered", "cancelled", "rejected"].includes(o.status))
    if (orderFilter === "completed") return allOrders.filter((o) => ["delivered", "cancelled", "rejected"].includes(o.status))
    return allOrders
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-[#4194AF] text-white sticky top-0 z-50">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="font-black text-base tracking-tight">Gruwcer</a>
          <button onClick={() => { clearAuth(); window.location.href = "/" }} className="text-xs text-white/70 hover:text-white flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-lg mx-auto">
        {/* Profile Card */}
        <div className="bg-white mx-4 mt-4 rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#4194AF] to-[#4194AF] px-5 pt-6 pb-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center border-2 border-white/30">
                <span className="text-2xl font-black text-white">{(profile?.name || "U").charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-white">{profile?.name || "Customer"}</h1>
                <p className="text-white/70 text-xs">{user.email || profile?.phone}</p>
              </div>
            </div>
          </div>
          {/* Stats overlay */}
          <div className="mx-4 -mt-6 relative">
            <div className="bg-white rounded-xl shadow-md border border-gray-100 grid grid-cols-3 divide-x divide-gray-100">
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-[#4194AF]">{totalActive}</p>
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Active</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-gray-800">{totalOrders}</p>
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Orders</p>
              </div>
              <div className="p-3 text-center">
                <p className="text-lg font-bold text-[#4194AF]">₱{totalSpent.toFixed(0)}</p>
                <p className="text-[9px] text-gray-400 uppercase font-semibold">Spent</p>
              </div>
            </div>
          </div>
          <div className="h-4" />
        </div>

        {/* Wallet Card */}
        <a href="/account/wallet" className="block mx-4 mt-4 bg-gradient-to-r from-green-600 to-[#93D569] rounded-xl p-4 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <div>
                <p className="text-white/70 text-[10px] uppercase font-semibold">Wallet Balance</p>
                <p className="text-xl font-black">₱{walletBalance.toFixed(2)}</p>
              </div>
            </div>
            <div className="bg-white/20 rounded-full px-3 py-1.5">
              <span className="text-xs font-bold">Top Up →</span>
            </div>
          </div>
        </a>

        {/* Quick Menu */}
        <div className="mx-4 mt-4 grid grid-cols-4 gap-2">
          {[
            { href: "/grocery", icon: "https://img.icons8.com/3d-fluency/94/shopping-cart.png", label: "Grocery" },
            { href: "/laundry", icon: "https://img.icons8.com/3d-fluency/94/washing-machine.png", label: "Laundry" },
            { href: "/home-services", icon: "https://img.icons8.com/3d-fluency/94/maintenance.png", label: "Services" },
            { href: "/account/wallet", icon: "https://img.icons8.com/3d-fluency/94/wallet.png", label: "Wallet" },
          ].map((item) => (
            <a key={item.href} href={item.href} className="bg-white rounded-xl p-3 border border-gray-100 text-center hover:shadow-sm transition-shadow">
              <img src={item.icon} alt={item.label} className="w-8 h-8 mx-auto object-contain" />
              <span className="text-[10px] text-gray-600 font-medium mt-1 block">{item.label}</span>
            </a>
          ))}
        </div>

        {/* Tab Switch */}
        <div className="mx-4 mt-5 flex bg-gray-100 rounded-xl p-1">
          <button onClick={() => setTab("orders")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === "orders" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}>
            My Orders
          </button>
          <button onClick={() => setTab("profile")} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all ${tab === "profile" ? "bg-white text-gray-800 shadow-sm" : "text-gray-400"}`}>
            Profile
          </button>
        </div>

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div className="px-4 pt-4 pb-8">
            {/* Order filter */}
            <div className="flex gap-2 mb-4">
              {(["active", "completed", "all"] as const).map((f) => (
                <button key={f} onClick={() => setOrderFilter(f)} className={`px-3 py-1.5 text-[11px] rounded-lg font-medium capitalize transition-colors ${orderFilter === f ? "bg-[#4194AF] text-white" : "bg-white border border-gray-200 text-gray-500"}`}>
                  {f} {f === "active" && totalActive > 0 ? `(${totalActive})` : ""}
                </button>
              ))}
            </div>

            {/* Orders list */}
            <div className="space-y-3">
              {getFilteredOrders().length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
                  <img src={orderFilter === "active" ? "https://img.icons8.com/3d-fluency/94/confetti.png" : "https://img.icons8.com/3d-fluency/94/clipboard.png"} alt="" className="w-14 h-14 mx-auto mb-3 object-contain" />
                  <p className="text-gray-500 text-sm font-medium">{orderFilter === "active" ? "No active orders" : "No orders yet"}</p>
                  <p className="text-gray-300 text-xs mt-1">{orderFilter === "active" ? "You're all caught up!" : "Start shopping to see orders here"}</p>
                  <div className="flex gap-3 justify-center mt-5">
                    <a href="/grocery" className="text-xs bg-[#4194AF] text-white px-4 py-2.5 rounded-lg font-bold">Shop Grocery</a>
                    <a href="/laundry" className="text-xs bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold">Book Laundry</a>
                  </div>
                </div>
              ) : (
                getFilteredOrders().slice(0, 20).map((order) => {
                  const isGrocery = order.type === "grocery"
                  const href = isGrocery ? `/order?id=${order.id}` : "/laundry"
                  return (
                    <a key={`${order.type}-${order.id}`} href={href} className="block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isGrocery ? "bg-[#4194AF]/10" : "bg-blue-50"}`}>
                          {isGrocery ? (
                            <svg className="w-5 h-5 text-[#4194AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                          ) : (
                            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /><circle cx="12" cy="14" r="4" strokeWidth={2} /></svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                              {order.status.replace(/_/g, " ")}
                            </span>
                            <span className="text-[10px] text-gray-300 capitalize">{order.type}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {isGrocery ? `${(order as any).items?.length || 0} items` : `${(order as any).serviceName || "Laundry"} • ${(order as any).weight || 0}kg`}
                            {" • "}{order.createdAt?.toLocaleDateString?.(undefined, { month: "short", day: "numeric" }) || ""}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${isGrocery ? "text-[#4194AF]" : "text-blue-600"}`}>₱{order.amount}</p>
                          <svg className="w-4 h-4 text-gray-300 ml-auto mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </div>
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <div className="px-4 pt-4 pb-8 space-y-3">
            {/* Profile Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Account Information</h3>
              </div>
              <div className="divide-y divide-gray-50">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    <span className="text-sm text-gray-500">Name</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{profile?.name || "—"}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    <span className="text-sm text-gray-500">Email</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{user.email || "—"}</span>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    <span className="text-sm text-gray-500">Phone</span>
                  </div>
                  <span className="text-sm font-medium text-gray-800">{profile?.phone || "—"}</span>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Quick Access</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {[
                  { href: "/account/wallet", icon: "https://img.icons8.com/3d-fluency/94/wallet.png", label: "My Wallet", desc: `Balance: ₱${walletBalance.toFixed(0)}` },
                  { href: "/grocery", icon: "https://img.icons8.com/3d-fluency/94/shopping-cart.png", label: "Shop Grocery", desc: "Browse & order products" },
                  { href: "/laundry", icon: "https://img.icons8.com/3d-fluency/94/washing-machine.png", label: "Laundry Service", desc: "Book pickup & delivery" },
                  { href: "/home-services", icon: "https://img.icons8.com/3d-fluency/94/maintenance.png", label: "Home Services", desc: "Aircon, plumbing & more" },
                ].map((item) => (
                  <a key={item.href} href={item.href} className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                    <img src={item.icon} alt={item.label} className="w-8 h-8 object-contain shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{item.label}</p>
                      <p className="text-[11px] text-gray-400">{item.desc}</p>
                    </div>
                    <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </a>
                ))}
              </div>
            </div>

            {/* Support */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="divide-y divide-gray-50">
                <a href="/auth" className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                  <img src="https://img.icons8.com/3d-fluency/94/lock.png" alt="Security" className="w-8 h-8 object-contain shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">Security & Login</p>
                    <p className="text-[11px] text-gray-400">Change password, manage sessions</p>
                  </div>
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </a>
                <button onClick={() => { clearAuth(); window.location.href = "/" }} className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-[#4194AF]/10 transition-colors text-left">
                  <img src="https://img.icons8.com/3d-fluency/94/exit.png" alt="Logout" className="w-8 h-8 object-contain shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#3a7d96]">Logout</p>
                    <p className="text-[11px] text-gray-400">Sign out of your account</p>
                  </div>
                </button>
              </div>
            </div>

            {/* App version */}
            <p className="text-center text-[10px] text-gray-300 pt-4">Gruwcer v1.0 • Made with ❤️ in Cebu</p>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
        <div className="max-w-lg mx-auto grid grid-cols-4 py-1.5">
          <a href="/" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[10px] font-medium">Home</span>
          </a>
          <a href="/grocery" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <span className="text-[10px] font-medium">Grocery</span>
          </a>
          <a href="/laundry" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            <span className="text-[10px] font-medium">Laundry</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-[#4194AF]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-bold">Account</span>
          </a>
        </div>
      </nav>
    </main>
  )
}
