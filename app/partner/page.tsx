"use client"

import { useEffect, useState, useRef } from "react"
// Firebase auth removed

import { useNotificationSound } from "@/app/components/useNotificationSound"


type LaundryOrder = {
  id: string
  serviceName: string
  weight: number
  price: number
  pickupAddress: string
  notes: string
  status: string
  customerName: string
  customerPhone: string
  partnerId?: string
  paymentMethod?: string
  createdAt: any
}

type ServiceItem = { id: string; name: string; price: number; unit: string }

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  rider_to_laundromat: "bg-cyan-100 text-cyan-800",
  at_laundromat: "bg-purple-100 text-purple-800",
  washing: "bg-indigo-100 text-indigo-800",
  ready: "bg-orange-100 text-orange-800",
  rider_return_pickup: "bg-teal-100 text-teal-800",
  rider_returning: "bg-teal-100 text-teal-800",
  delivered: "bg-[#59EBC6]/20 text-green-800",
}

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

export default function PartnerPage() {
  const [user, setUser] = useState<any>(null)
  const [partner, setPartner] = useState<any>(null)
  const [orders, setOrders] = useState<LaundryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [commissionPercent, setCommissionPercent] = useState(15)
  const [walletBalance, setWalletBalance] = useState(0)
  const [listingMode, setListingMode] = useState<"free" | "wallet_required">("free")
  const [minBalance, setMinBalance] = useState(100)
  const [tab, setTab] = useState<"orders" | "services" | "promos" | "shop">("orders")
  // Promos
  const [promos, setPromos] = useState<{ id: string; title: string; description: string; promoCode: string; discountPercent: number; minOrder: number; validUntil: string; active: boolean }[]>([])
  const [showAddPromo, setShowAddPromo] = useState(false)
  const [promoForm, setPromoForm] = useState({ title: "", description: "", promoCode: "", discountPercent: 10, minOrder: 0, validUntil: "" })
  // Services
  const [services, setServices] = useState<ServiceItem[]>([])
  const [showAddService, setShowAddService] = useState(false)
  const [serviceForm, setServiceForm] = useState({ name: "", price: 0, unit: "per kg" })
  const [savingServices, setSavingServices] = useState(false)
  // Shop settings
  const [logoUrl, setLogoUrl] = useState("")
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [isOnline, setIsOnline] = useState(true)
  const [openTime, setOpenTime] = useState("08:00")
  const [closeTime, setCloseTime] = useState("20:00")
  const [openDays, setOpenDays] = useState<string[]>(ALL_DAYS)
  const [landmark, setLandmark] = useState("")
  const [address, setAddress] = useState("")
  const [shopLat, setShopLat] = useState(0)
  const [shopLng, setShopLng] = useState(0)
  const [detectingLoc, setDetectingLoc] = useState(false)
  const [savingShop, setSavingShop] = useState(false)
  const [successMsg, setSuccessMsg] = useState("")
  const playSound = useNotificationSound()
  const prevOrderStatuses = useRef<Record<string, string>>({})

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    if (!u) { setLoading(false); return }
    setUser(u)
    const token = localStorage.getItem("token")
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(async (p: any) => {
        if (!p) { setLoading(false); return }
        setPartner(p)
        if (p.services) setServices(p.services)
        if (p.logoUrl) setLogoUrl(p.logoUrl)
        if (p.isOnline !== undefined) setIsOnline(p.isOnline)
        if (p.openTime) setOpenTime(p.openTime)
        if (p.closeTime) setCloseTime(p.closeTime)
        if (p.openDays) setOpenDays(p.openDays)
        if (p.landmark) setLandmark(p.landmark)
        if (p.address) setAddress(p.address)
        if (p.lat) setShopLat(p.lat)
        if (p.lng) setShopLng(p.lng)
        setWalletBalance(p.walletBalance || 0)
        const s = await fetch("/api/delivery-settings").then(r => r.json())
        setCommissionPercent(s.partnerCommissionPercent || 15)
        setListingMode(p.listingMode || "free")
        setMinBalance(p.minimumBalance ?? 100)
        setLoading(false)
      })
    // no unsub
  }, [])

  // Load partner promos
  useEffect(() => {
    if (!partner) return
    const iv = setInterval(async () => {
      const r = await fetch(`/api/promos?partnerId=${partner.id}`)
      if (r.ok) setPromos(await r.json())
    }, 10000)
    fetch(`/api/promos?partnerId=${partner.id}`).then(r => r.json()).then(setPromos)
    return () => clearInterval(iv)
  }, [partner])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(""), 2500)
  }

  const addPromo = async () => {
    if (!partner || !promoForm.title || !promoForm.discountPercent) return
    await fetch("/api/promos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerId: partner.id, partnerName: partner.shopName, ...promoForm, active: true }) })
    setPromoForm({ title: "", description: "", promoCode: "", discountPercent: 10, minOrder: 0, validUntil: "" })
    setShowAddPromo(false)
    showSuccess("Promo created successfully!")
  }

  const togglePromo = async (promoId: string, active: boolean) => {
    await fetch(`/api/promos/${promoId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active }) })
    showSuccess(active ? "Promo activated!" : "Promo deactivated")
  }

  const deletePromo = async (promoId: string) => {
    await fetch(`/api/promos/${promoId}`, { method: "DELETE" })
    showSuccess("Promo deleted")
  }

  useEffect(() => {
    if (!partner || partner.status !== "active") return
    const iv = setInterval(async () => {
      const r = await fetch(`/api/laundry-orders?partnerId=${partner.id}`)
      if (!r.ok) return
      const allOrders = await r.json()
      let shouldNotify = false
      allOrders.forEach((order: any) => {
        const prev = prevOrderStatuses.current[order.id]
        if (!prev && order.status === "pending") shouldNotify = true
        else if (prev && prev !== order.status) { shouldNotify = true; showSuccess(`Order #${order.id.slice(0, 6)} → ${order.status.replace(/_/g, " ")}`) }
      })
      if (shouldNotify && Object.keys(prevOrderStatuses.current).length > 0) playSound()
      const newStatuses: Record<string, string> = {}
      allOrders.forEach((o: any) => { newStatuses[o.id] = o.status })
      prevOrderStatuses.current = newStatuses
      setOrders(allOrders)
    }, 5000)
    return () => clearInterval(iv)
  }, [partner, playSound])

  const handleStatus = async (orderId: string, status: string) => {
    await fetch(`/api/laundry-orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
  }

  const handleToggleOnline = async () => {
    if (!partner) return
    const next = !isOnline
    setIsOnline(next)
    await fetch(`/api/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOnline: next }) })
    showSuccess(next ? "Shop is now OPEN" : "Shop is now CLOSED")
  }

  // Save shop settings
  const saveShopSettings = async () => {
    if (!partner) return
    setSavingShop(true)
    const update: any = { openTime, closeTime, openDays, landmark, address }
    if (shopLat) update.lat = shopLat
    if (shopLng) update.lng = shopLng
    await fetch(`/api/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(update) })
    setSavingShop(false)
    showSuccess("Shop settings saved successfully!")
  }

  // Detect location
  const detectLocation = () => {
    if (!navigator.geolocation) return
    setDetectingLoc(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setShopLat(latitude)
        setShopLng(longitude)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          const data = await res.json()
          setAddress(data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        } catch {
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`)
        } finally { setDetectingLoc(false) }
      },
      () => { setDetectingLoc(false) },
      { enableHighAccuracy: true }
    )
  }

  const addService = async () => {
    if (!serviceForm.name || !serviceForm.price || !partner) return
    const newService: ServiceItem = { id: Date.now().toString(), name: serviceForm.name, price: serviceForm.price, unit: serviceForm.unit }
    const updated = [...services, newService]
    setServices(updated)
    setServiceForm({ name: "", price: 0, unit: "per kg" })
    setShowAddService(false)
    await fetch(`/api/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services: updated }) })
    showSuccess("Service added successfully!")
  }

  const removeService = async (id: string) => {
    if (!partner) return
    const updated = services.filter((s) => s.id !== id)
    setServices(updated)
    await fetch(`/api/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services: updated }) })
    showSuccess("Service removed")
  }

  const saveServices = async () => {
    if (!partner) return
    setSavingServices(true)
    await fetch(`/api/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services }) })
    setSavingServices(false)
    showSuccess("Services saved successfully!")
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /><circle cx="12" cy="14" r="4" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h2m2 0h2" /></svg>
        </div>
        <h2 className="font-bold text-lg text-gray-800 mb-1">Partner Login</h2>
        <p className="text-sm text-gray-400 mb-4">Sign in to manage your laundry shop</p>
        <a href="/auth?tab=login&redirect=/partner" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700">Sign In</a>
        <p className="text-xs text-gray-400 mt-3">Not a partner yet? <a href="/auth?tab=partner" className="text-blue-600 font-bold">Register here</a></p>
      </div>
    </div>
  )

  if (!partner) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 text-sm">No partner profile found for this account.</p>
        <a href="/auth?tab=partner" className="inline-block mt-3 text-blue-600 text-sm font-bold">Register as Partner</a>
        <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/auth" }} className="block mx-auto mt-2 text-xs text-gray-400">Logout</button>
      </div>
    </div>
  )

  if (partner.status === "pending") return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="font-bold text-xl text-gray-800 mb-2">Application Pending</h2>
          <div className="bg-yellow-50 rounded-xl p-4 text-left mb-4">
            <p className="text-sm text-gray-700"><span className="font-bold">{partner.shopName}</span></p>
            <p className="text-xs text-gray-500 mt-1">{partner.address}</p>
            <p className="text-xs text-gray-500">{partner.phone}</p>
          </div>
          <p className="text-sm text-gray-500 mb-2">Your application is being reviewed by our team.</p>
          <p className="text-xs text-gray-400">Within <span className="font-bold text-gray-600">24 hours</span> you will receive confirmation.</p>
          <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/auth" }} className="mt-5 text-xs text-gray-400 hover:text-gray-600">Logout</button>
        </div>
      </div>
    </main>
  )

  // ACTIVE PARTNER DASHBOARD
  const visibleOrders = orders.filter((o) => o.status !== "awaiting_payment")
  const activeOrders = visibleOrders.filter((o) => ["at_laundromat", "washing", "rider_to_laundromat", "rider_picked_up", "rider_to_customer", "accepted"].includes(o.status))
  const pendingOrders = visibleOrders.filter((o) => o.status === "pending")
  const readyOrders = visibleOrders.filter((o) => ["ready", "rider_return_pickup", "rider_returning"].includes(o.status))
  const completedOrders = visibleOrders.filter((o) => ["delivered"].includes(o.status))
  const totalEarnings = completedOrders.reduce((s, o) => s + Math.round(o.price * (100 - commissionPercent) / 100), 0)

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header with Online Toggle */}
      <header className="bg-blue-600 text-white px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <div className="w-9 h-9 rounded-full overflow-hidden border-2 border-white/30">
                <img src={logoUrl} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xs font-bold">{partner.shopName.charAt(0)}</span>
              </div>
            )}
            <div>
              <p className="font-bold text-sm">{partner.shopName}</p>
              <p className="text-[10px] text-white/60">Partner Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Online/Offline Toggle */}
            <button onClick={handleToggleOnline} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isOnline ? "bg-[#319F44]/100" : "bg-[#319F44]/100/80"}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-white animate-pulse" : "bg-white/60"}`} />
              {isOnline ? "OPEN" : "CLOSED"}
            </button>
            <a href="/partner/wallet" className="text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            </a>
            <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/auth" }} className="text-white/70 hover:text-white text-xs">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto pb-8">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-2 px-4 py-4">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-yellow-600">{pendingOrders.length}</p>
            <p className="text-[9px] text-gray-400">New</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-purple-600">{activeOrders.length}</p>
            <p className="text-[9px] text-gray-400">Active</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-orange-600">{readyOrders.length}</p>
            <p className="text-[9px] text-gray-400">Ready</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-[#319F44]">₱{totalEarnings}</p>
            <p className="text-[9px] text-gray-400">Earned</p>
          </div>
          <a href="/partner/wallet" className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className={`text-lg font-bold ${walletBalance >= 100 ? "text-blue-600" : "text-green-500"}`}>₱{walletBalance.toFixed(0)}</p>
            <p className="text-[9px] text-gray-400">Wallet</p>
          </a>
        </div>

        {/* Low Wallet Warning */}
        {listingMode === "wallet_required" && walletBalance < minBalance && (
          <div className="mx-4 mb-3 bg-[#319F44]/10 border border-green-200 rounded-xl px-4 py-3">
            <div className="flex items-start gap-3">
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-xs font-bold text-green-800">Wallet balance too low!</p>
                <p className="text-[10px] text-[#267a34] mt-0.5">You need at least ₱{minBalance} to accept bookings. Please top up your wallet.</p>
                <a href="/partner/wallet" className="inline-block mt-2 text-[10px] bg-green-700 text-white px-3 py-1.5 rounded-lg font-bold">Top Up Now</a>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white flex border-b border-gray-200 sticky top-[52px] z-20">
          {(["orders", "promos", "services", "shop"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-xs font-bold relative capitalize ${tab === t ? "text-blue-600" : "text-gray-400"}`}>
              {t === "shop" ? "Shop" : t}
              {tab === t && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          ))}
        </div>

        {/* ORDERS TAB */}
        {tab === "orders" && (
          <div className="px-4 pt-4 space-y-3">
            {visibleOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-gray-400 text-sm">No orders yet</p>
                <p className="text-xs text-gray-300 mt-1">Orders will appear when customers book your shop</p>
              </div>
            ) : (
              visibleOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 6)}</span>
                      {/* Payment method badge */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        order.paymentMethod === "xendit" ? "bg-[#59EBC6]/20 text-[#267a34]" : "bg-amber-100 text-amber-700"
                      }`}>
                        {order.paymentMethod === "xendit" ? "✓ PAID" : "💵 COD"}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">₱{order.price}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-bold text-gray-800">{order.serviceName} — {order.weight}kg</p>
                    <p className="text-xs text-gray-400 mt-1">{order.customerName} • {order.customerPhone}</p>
                    {order.notes && <p className="text-xs text-gray-500 bg-yellow-50 rounded px-2 py-1 mt-2">📝 {order.notes}</p>}
                    <div className="bg-[#319F44]/10 rounded-lg p-3 mt-3 space-y-1">
                      <div className="flex justify-between text-xs"><span className="text-gray-600">Service Fee</span><span>₱{order.price}</span></div>
                      <div className="flex justify-between text-xs"><span className="text-green-500">Commission ({commissionPercent}%)</span><span className="text-green-500">-₱{Math.round(order.price * commissionPercent / 100)}</span></div>
                      <div className="border-t border-green-200 pt-1 flex justify-between"><span className="text-xs font-bold text-[#267a34]">Your Earnings</span><span className="text-sm font-bold text-[#267a34]">₱{Math.round(order.price * (100 - commissionPercent) / 100)}</span></div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      {order.status === "pending" && (
                        <div className="flex gap-2 w-full">
                          <button onClick={() => handleStatus(order.id, "cancelled")} className="flex-1 border border-green-200 text-[#267a34] py-2.5 rounded-lg text-xs font-bold">Reject</button>
                          {listingMode === "free" || walletBalance >= minBalance ? (
                            <button onClick={() => handleStatus(order.id, "accepted")} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold">Accept</button>
                          ) : (
                            <a href="/partner/wallet" className="flex-1 bg-gray-300 text-gray-600 py-2.5 rounded-lg text-xs font-bold text-center">Top Up to Accept</a>
                          )}
                        </div>
                      )}
                      {order.status === "accepted" && <p className="text-xs text-blue-600 font-medium">✓ Accepted — Waiting for rider</p>}
                      {(order.status === "rider_picked_up" || order.status === "rider_to_laundromat") && <p className="text-xs text-cyan-600 font-medium">🏍️ Rider bringing laundry to you</p>}
                      {order.status === "at_laundromat" && <button onClick={() => handleStatus(order.id, "washing")} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg text-xs font-bold">Start Washing</button>}
                      {order.status === "washing" && <button onClick={() => handleStatus(order.id, "ready")} className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg text-xs font-bold">Mark Ready</button>}
                      {order.status === "ready" && <p className="text-xs text-orange-600 font-medium">⏳ Waiting for rider pickup</p>}
                      {(order.status === "rider_return_pickup" || order.status === "rider_returning") && <p className="text-xs text-teal-600 font-medium">🏍️ Rider returning to customer</p>}
                      {order.status === "delivered" && <p className="text-xs text-[#319F44] font-medium">✓ Completed</p>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* PROMOS TAB */}
        {tab === "promos" && (
          <div className="px-4 pt-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-gray-800">My Shop Promos</h3>
                <button onClick={() => setShowAddPromo(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">+ New Promo</button>
              </div>
              {promos.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-2xl mb-2">🏷️</p>
                  <p className="text-xs text-gray-400">No promos yet</p>
                  <p className="text-[10px] text-gray-300 mt-1">Create a promo to attract more customers</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {promos.map((promo) => (
                    <div key={promo.id} className={`rounded-xl border p-4 ${promo.active ? "border-green-200 bg-[#319F44]/10" : "border-gray-200 bg-gray-50 opacity-60"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-gray-800">{promo.title}</span>
                            <span className="text-xs font-bold text-[#267a34] bg-[#59EBC6]/20 px-2 py-0.5 rounded-full">{promo.discountPercent}% OFF</span>
                          </div>
                          {promo.promoCode && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 bg-white border border-dashed border-blue-300 rounded-md px-2 py-1">
                              <span className="text-[10px] text-gray-400">CODE:</span>
                              <span className="text-xs font-bold text-blue-700 tracking-wide">{promo.promoCode}</span>
                            </div>
                          )}
                          {promo.description && <p className="text-xs text-gray-500 mt-1">{promo.description}</p>}
                          <div className="flex gap-3 mt-2">
                            {promo.minOrder > 0 && <span className="text-[10px] text-gray-400">Min. ₱{promo.minOrder}</span>}
                            {promo.validUntil && <span className="text-[10px] text-gray-400">Until {promo.validUntil}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => togglePromo(promo.id, !promo.active)} className={`w-10 h-5 rounded-full relative transition-colors ${promo.active ? "bg-[#319F44]/100" : "bg-gray-300"}`}>
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${promo.active ? "translate-x-5" : ""}`} />
                          </button>
                          <button onClick={() => deletePromo(promo.id)} className="text-green-400 hover:text-[#267a34]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SERVICES TAB */}
        {tab === "services" && (
          <div className="px-4 pt-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-sm text-gray-800">Services & Rates</h3>
                <button onClick={() => setShowAddService(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">+ Add</button>
              </div>
              {services.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <p className="text-2xl mb-2">🧺</p>
                  <p className="text-xs text-gray-400">No services added yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {services.map((s) => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-800">{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.unit}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-blue-600">₱{s.price}</span>
                        <button onClick={() => removeService(s.id)} className="text-green-400 hover:text-[#267a34]">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {services.length > 0 && (
                <button onClick={saveServices} disabled={savingServices} className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold disabled:opacity-50">
                  {savingServices ? "Saving..." : "Save Services"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* SHOP TAB — FoodPanda style */}
        {tab === "shop" && (
          <div className="px-4 pt-4 space-y-4">
            {/* Online Status Card */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-gray-800">Shop Status</h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">Customers {isOnline ? "can" : "cannot"} see and book your shop</p>
                </div>
                <button onClick={handleToggleOnline} className={`relative w-14 h-7 rounded-full transition-colors ${isOnline ? "bg-[#319F44]/100" : "bg-gray-300"}`}>
                  <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOnline ? "translate-x-7" : ""}`} />
                </button>
              </div>
              <div className={`mt-3 rounded-lg px-3 py-2 ${isOnline ? "bg-[#319F44]/10 border border-green-200" : "bg-[#319F44]/10 border border-green-200"}`}>
                <p className={`text-xs font-bold ${isOnline ? "text-[#267a34]" : "text-green-800"}`}>
                  {isOnline ? "🟢 Your shop is OPEN and accepting orders" : "🔴 Your shop is CLOSED — not visible to customers"}
                </p>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Operating Hours</h3>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Opens at</label>
                  <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-600" />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Closes at</label>
                  <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Open Days</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ALL_DAYS.map((day) => (
                    <button
                      key={day}
                      onClick={() => setOpenDays((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${openDays.includes(day) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Logo */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Shop Logo</h3>
              <div className="flex items-center gap-4">
                <div
                  onClick={() => logoInputRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-colors relative flex-shrink-0"
                >
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <svg className="w-5 h-5 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                  )}
                  {uploadingLogo && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>}
                </div>
                <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (!file || !partner) return
                  setUploadingLogo(true)
                  try { const fd = new FormData(); fd.append("file", file); fd.append("folder", "partners"); const uploadRes = await fetch("/api/upload", { method: "POST", body: fd }); const { url } = await uploadRes.json(); await fetch(`/api/partners/${partner.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logoUrl: url }) }); setLogoUrl(url) } catch {} finally { setUploadingLogo(false) }
                }} />
                <div>
                  <p className="text-xs text-gray-700 font-medium">Upload your shop logo</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Displayed as a circle on the customer app</p>
                  <button onClick={() => logoInputRef.current?.click()} className="mt-2 text-[10px] text-blue-600 font-bold">{logoUrl ? "Change Photo" : "Upload Photo"}</button>
                </div>
              </div>
            </div>

            {/* Address & Location */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Shop Location</h3>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Address</label>
                  <div className="relative mt-1">
                    <textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Shop full address" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-24 text-sm outline-none focus:border-blue-600 resize-none" rows={2} />
                    <button onClick={detectLocation} disabled={detectingLoc} className="absolute right-2 top-2 text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-md">
                      {detectingLoc ? "Detecting..." : "📍 Auto-detect"}
                    </button>
                  </div>
                  {shopLat > 0 && <p className="text-[9px] text-[#319F44] mt-1">✓ GPS coordinates saved ({shopLat.toFixed(4)}, {shopLng.toFixed(4)})</p>}
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Landmark</label>
                  <input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="e.g. Near Mercury Drug, beside 7-Eleven" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm mt-1 outline-none focus:border-blue-600" />
                  <p className="text-[9px] text-gray-400 mt-1">Helps customers and riders find your shop easily</p>
                </div>
              </div>
            </div>

            {/* Shop Details */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <h3 className="font-bold text-sm text-gray-800 mb-3">Shop Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-400">Shop Name</span><span className="font-medium text-gray-700">{partner.shopName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Owner</span><span className="font-medium text-gray-700">{partner.ownerName}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Phone</span><span className="font-medium text-gray-700">{partner.phone}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Account Status</span><span className="font-bold text-[#319F44] capitalize">{partner.status}</span></div>
              </div>
            </div>

            {/* Save */}
            <button onClick={saveShopSettings} disabled={savingShop} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
              {savingShop ? "Saving..." : "Save Shop Settings"}
            </button>
          </div>
        )}
      </div>

      {/* Add Promo Modal */}
      {showAddPromo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddPromo(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="font-bold text-white">Create Promo</h2>
              <p className="text-white/60 text-xs">Offer discounts to attract customers</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Promo Title</label>
                <input placeholder="e.g. Grand Opening 20% OFF" value={promoForm.title} onChange={(e) => setPromoForm({ ...promoForm, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Promo Code</label>
                <input placeholder="e.g. WASH20" value={promoForm.promoCode} onChange={(e) => setPromoForm({ ...promoForm, promoCode: e.target.value.toUpperCase().replace(/\s/g, "") })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600 uppercase tracking-wide" />
                <p className="text-[10px] text-gray-400 mt-1">Customers enter this code to get the discount</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description (optional)</label>
                <input placeholder="e.g. Valid for all services" value={promoForm.description} onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Discount %</label>
                  <input type="number" min={1} max={100} value={promoForm.discountPercent || ""} onChange={(e) => setPromoForm({ ...promoForm, discountPercent: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Min Order (₱)</label>
                  <input type="number" min={0} value={promoForm.minOrder || ""} onChange={(e) => setPromoForm({ ...promoForm, minOrder: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Valid Until (optional)</label>
                <input type="date" value={promoForm.validUntil} onChange={(e) => setPromoForm({ ...promoForm, validUntil: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddPromo(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={addPromo} disabled={!promoForm.title || !promoForm.discountPercent} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">Create Promo</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddService(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="font-bold text-white">Add Service</h2>
              <p className="text-white/60 text-xs">Set your laundry service and rate</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Service Name</label>
                <input placeholder="e.g. Wash + Dry + Fold" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Price (₱)</label>
                <input type="number" min={0} placeholder="63" value={serviceForm.price || ""} onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Unit</label>
                <select value={serviceForm.unit} onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600">
                  <option value="per kg">Per Kilogram</option>
                  <option value="per piece">Per Piece</option>
                  <option value="per load">Per Load</option>
                  <option value="per bag">Per Bag</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddService(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={addService} disabled={!serviceForm.name || !serviceForm.price} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">Add Service</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-xs w-full text-center pointer-events-auto animate-[fadeIn_0.2s_ease-out]">
            <div className="w-14 h-14 bg-[#59EBC6]/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#319F44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-bold text-sm text-gray-800">{successMsg}</p>
            <p className="text-[10px] text-gray-400 mt-1">Changes synced to your account</p>
          </div>
        </div>
      )}
    </main>
  )
}
