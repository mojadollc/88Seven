"use client"

import { useEffect, useState, useRef } from "react"
import { useNotificationSound } from "@/app/components/useNotificationSound"

type Tab = "available" | "active" | "history"

export default function DriverPage() {
  const [driver, setDriver] = useState<{ id: string; name: string; email: string; profileComplete?: boolean; profileVerified?: boolean; walletBalance?: number; selfieUrl?: string } | null>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loginError, setLoginError] = useState("")
  const [orders, setOrders] = useState<any[]>([])
  const [availableOrders, setAvailableOrders] = useState<any[]>([])
  const [laundryOrders, setLaundryOrders] = useState<any[]>([])
  const [tab, setTab] = useState<Tab>("available")
  const [online, setOnline] = useState(false)
  const [sharing, setSharing] = useState<string | null>(null)
  const [driverNotifs, setDriverNotifs] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const watchRef = useRef<number | null>(null)
  const liveLocationRef = useRef<number | null>(null)
  // Chat
  const [chatOrderId, setChatOrderId] = useState<string | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatInput, setChatInput] = useState("")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const [riderFee, setRiderFee] = useState(30)
  const playSound = useNotificationSound()
  const prevAvailableCount = useRef(0)
  const prevNotifCount = useRef(0)

  useEffect(() => {
    const saved = localStorage.getItem("driver_session")
    if (saved) {
      const d = JSON.parse(saved)
      setDriver(d)
      setOnline(true)
      // Always re-fetch fresh data from Firestore
      fetch("/api/users?role=driver").then(r => r.json()).then((all: any[]) => {
        const found = all.find((x) => x.id === d.id)
        if (found) {
          const fresh = { id: found.id, name: found.name, email: found.email, profileComplete: found.profileComplete, profileVerified: found.profileVerified, walletBalance: found.walletBalance || 0, selfieUrl: found.selfieUrl }
          localStorage.setItem("driver_session", JSON.stringify(fresh))
          setDriver(fresh)
        }
      })
    } else {
      // No session — show login
    }
  }, [])

  useEffect(() => {
    fetch("/api/delivery-settings").then(r => r.json()).then((s: any) => setRiderFee(s.riderFeePerDelivery || 30))
  }, [])
  useEffect(() => {
    if (!driver) return
    const poll = () => fetch(`/api/orders?driverId=${driver.id}`).then(r => r.json()).then(setOrders)
    poll()
    const iv = setInterval(poll, 5000)
    return () => clearInterval(iv)
  }, [driver])

  // Listen to laundry orders assigned to this driver
  useEffect(() => {
    if (!driver) return
    const iv = setInterval(async () => {
      const r = await fetch(`/api/laundry-orders?riderId=${driver.id}`)
      if (r.ok) setLaundryOrders(await r.json())
    }, 5000)
    return () => clearInterval(iv)
  }, [driver])

  // Listen to driver notifications
  useEffect(() => {
    if (!driver) return
    const pollNotifs = () => fetch(`/api/notifications?recipientType=driver&recipientId=${driver.id}`).then(r => r.json()).then((notifs: any[]) => {
      const unread = notifs.filter((n: any) => !n.read).length
      if (unread > prevNotifCount.current && prevNotifCount.current >= 0) playSound()
      prevNotifCount.current = unread
      setDriverNotifs(notifs)
    })
    pollNotifs()
    const iv = setInterval(pollNotifs, 10000)
    return () => clearInterval(iv)
  }, [driver, playSound])

  // Listen to available orders (ready_for_pickup, unassigned)
  useEffect(() => {
    if (!driver || !online) return
    const pollAvail = () => fetch("/api/orders?status=ready_for_pickup").then(r => r.json()).then((all: any[]) => {
      const filtered = all.filter((o: any) => !o.driverId || o.driverId === driver.id)
      if (filtered.length > prevAvailableCount.current && prevAvailableCount.current >= 0) playSound()
      prevAvailableCount.current = filtered.length
      setAvailableOrders(filtered)
    })
    pollAvail()
    const iv = setInterval(pollAvail, 5000)
    return () => clearInterval(iv)
  }, [driver, online, playSound])

  const login = async () => {
    setLoginError("")
    try {
      const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", email, password }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (data.user.role !== "driver") { setLoginError("No rider account found for this email"); return }
      if (data.user.status === "pending") { setLoginError("Your rider application is still pending approval"); return }
      const session = { id: data.user.id, name: data.user.name, email: data.user.email, profileComplete: data.user.profileComplete, profileVerified: data.user.profileVerified, walletBalance: data.user.walletBalance || 0, selfieUrl: data.user.selfieUrl }
      localStorage.setItem("driver_session", JSON.stringify(session))
      setDriver(session)
      setOnline(true)
      await fetch(`/api/partners/${session.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOnline: true }) })
    } catch (e: any) {
      setLoginError(e.message || "Invalid email or password")
    }
  }

  const logout = () => {
    if (driver) fetch(`/api/partners/${driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOnline: false }) })
    if (liveLocationRef.current !== null) navigator.geolocation.clearWatch(liveLocationRef.current)
    localStorage.removeItem("driver_session")
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    setDriver(null)
    setOrders([])
    setOnline(false)
  }

  const toggleOnline = async () => {
    if (!driver) return
    const newState = !online
    setOnline(newState)
    await fetch(`/api/partners/${driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOnline: newState }) })
    if (newState && navigator.geolocation) {
      liveLocationRef.current = navigator.geolocation.watchPosition(
        (pos) => fetch(`/api/partners/${driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }) }),
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000 }
      )
    } else if (!newState && liveLocationRef.current !== null) {
      navigator.geolocation.clearWatch(liveLocationRef.current)
      liveLocationRef.current = null
    }
  }

  // ═══ RIDER FLOW ACTIONS ═══

  const acceptOrder = async (orderId: string) => {
    if (!driver) return
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driverId: driver.id, driverName: driver.name, status: "rider_accepted" }) })
    setTab("active")
  }

  const arrivedAtStore = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rider_at_store" }) })
  }

  const pickedUp = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "rider_picked_up" }) })
    startLocationSharing(orderId)
  }

  const startDelivery = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "out_for_delivery" }) })
  }

  const markDelivered = async (orderId: string) => {
    await fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "delivered" }) })
    stopLocationSharing()
    if (driver) {
      const order = orders.find((o: any) => o.id === orderId)
      const deliveryFee = order?.total ? Math.round(riderFee) : riderFee
      const commission = Math.round(deliveryFee * 20 / 100)
      await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: driver.id, ownerType: "rider", type: "commission_deduction", amount: -commission, orderId, note: `20% commission on ₱${deliveryFee} delivery fee` }) })
    }
  }

  const startLocationSharing = (orderId: string) => {
    if (!navigator.geolocation) return
    if (watchRef.current !== null) navigator.geolocation.clearWatch(watchRef.current)
    setSharing(orderId)
    watchRef.current = navigator.geolocation.watchPosition(
        (pos) => fetch(`/api/orders/${orderId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ driverLat: pos.coords.latitude, driverLng: pos.coords.longitude }) }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }

  const stopLocationSharing = () => {
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
    setSharing(null)
  }

  const toggleLocation = (orderId: string) => {
    if (sharing === orderId) { stopLocationSharing(); return }
    startLocationSharing(orderId)
  }

  // Chat listener
  useEffect(() => {
    if (!chatOrderId) return
    const poll = () => fetch(`/api/orders/${chatOrderId}`).then(r => r.ok ? r.json() : null).then((order: any) => {
      if (order?.chats) { setChatMessages(order.chats); setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100) }
    })
    poll()
    const iv = setInterval(poll, 3000)
    return () => clearInterval(iv)
  }, [chatOrderId])

  const handleSendChat = async () => {
    if (!chatInput.trim() || !chatOrderId || !driver) return
    await fetch("/api/orders/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: chatOrderId, senderId: driver.id, senderName: driver.name, senderRole: "driver", message: chatInput.trim() }) }).catch(() => {})
    setChatInput("")
  }

  // Categorize orders
  const activeLaundry = laundryOrders.filter((o: any) => ["rider_to_customer", "rider_picked_up", "rider_to_laundromat", "rider_return_pickup", "rider_returning"].includes(o.status)).map((o: any) => ({ ...o, _type: "laundry" }))
  const historyLaundry = laundryOrders.filter((o: any) => ["delivered", "at_laundromat", "washing", "ready"].includes(o.status)).map((o: any) => ({ ...o, _type: "laundry" }))
  const activeOrders = orders.filter((o) => ["rider_accepted", "rider_at_store", "rider_picked_up", "out_for_delivery"].includes(o.status)).map((o) => ({ ...o, _type: "grocery" }))
  const historyOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status)).map((o) => ({ ...o, _type: "grocery" }))
  const allActive = [...activeOrders, ...activeLaundry]
  const allHistory = [...historyOrders, ...historyLaundry]
  const displayOrders = tab === "available" ? availableOrders.map((o) => ({ ...o, _type: "grocery" })) : tab === "active" ? allActive : allHistory

  // Earnings
  const deliveredOrders = orders.filter((o) => o.status === "delivered")
  const deliveredLaundry = laundryOrders.filter((o: any) => o.status === "delivered")
  const allDelivered = [...deliveredOrders, ...deliveredLaundry]
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDelivered = allDelivered.filter((o: any) => {
    const d = o.deliveredAt || o.updatedAt || o.createdAt
    return d && d >= today
  })
  const totalEarnings = allDelivered.length * riderFee
  const todayEarnings = todayDelivered.length * riderFee

  // ═══ LOGIN SCREEN ═══
  if (!driver) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-[#319F44] to-[#267a34] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-white rounded-full mx-auto flex items-center justify-center shadow-lg mb-4">
              <svg className="w-10 h-10 text-[#319F44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">Gruwcer Rider</h1>
            <p className="text-white/70 text-sm mt-1">Delivery Partner App</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="font-bold text-lg text-gray-800 mb-1">Sign In</h2>
            <p className="text-xs text-gray-400 mb-5">Enter your rider credentials</p>

            {loginError && (
              <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-4">{loginError}</div>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500">Email</label>
                <input type="email" placeholder="rider@payroo.com" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mt-1 outline-none focus:border-[#319F44] focus:ring-1 focus:ring-[#319F44]" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500">Password</label>
                <input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm mt-1 outline-none focus:border-[#319F44] focus:ring-1 focus:ring-[#319F44]" />
              </div>
              <button onClick={login} className="w-full bg-[#319F44] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#267a34] transition-colors mt-2">
                Login
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // ═══ RIDER DASHBOARD ═══
  const canAcceptTasks = driver?.profileComplete && driver?.profileVerified && (driver?.walletBalance || 0) >= 100
  return (
    <main className="min-h-screen bg-gray-100 max-w-lg mx-auto flex flex-col">
      {/* Header */}
      <header className="bg-[#319F44] text-white px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">{driver.name}</p>
              <p className="text-[10px] text-white/70">Rider</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Notification Bell */}
            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative text-white/80 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {driverNotifs.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-yellow-400 text-[#1F2937] text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">{driverNotifs.filter((n) => !n.read).length}</span>
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-8 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                  <div className="px-3 py-2 border-b flex items-center justify-between bg-gray-50">
                    <span className="text-xs font-bold text-gray-800">Notifications</span>
                    {driverNotifs.filter((n) => !n.read).length > 0 && driver && (
                      <button onClick={() => fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAllRead", recipientType: "driver", recipientId: driver.id }) }).then(() => setDriverNotifs((n: any[]) => n.map(x => ({...x, read: true}))))} className="text-[10px] text-[#319F44] font-medium">Mark read</button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {driverNotifs.length === 0 ? (
                      <p className="p-3 text-center text-gray-400 text-xs">No notifications</p>
                    ) : (
                      driverNotifs.slice(0, 10).map((n) => (
                        <div key={n.id} className={`px-3 py-2 border-b border-gray-50 ${!n.read ? "bg-blue-50" : ""}`}>
                          <p className="text-[11px] font-bold text-gray-800">{n.title}</p>
                          <p className="text-[10px] text-gray-500">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <a href="/driver/wallet" className={`px-2 py-1 rounded-full text-[10px] font-bold ${(driver?.walletBalance || 0) >= 100 ? "bg-green-400/20 text-green-200" : "bg-green-400/20 text-green-200"}`}>₱{(driver?.walletBalance || 0).toFixed(0)}</a>
            <button
              onClick={toggleOnline}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all ${
                online ? "bg-green-400 text-green-900 shadow-lg shadow-green-400/30" : "bg-gray-500 text-white"
              }`}
            >
              {online ? "● ONLINE" : "○ OFFLINE"}
            </button>
            <button onClick={logout} className="text-white/70 hover:text-white text-xs ml-1">⏻</button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!online && (
        <div className="bg-gray-800 text-white text-center py-4 px-4">
          <p className="font-bold text-sm">You are offline</p>
          <p className="text-xs text-gray-400 mt-1">Go online to receive delivery tasks</p>
          <button onClick={toggleOnline} className="mt-3 bg-[#319F44]/100 text-white px-6 py-2 rounded-full text-xs font-bold">
            Go Online
          </button>
        </div>
      )}

      {/* Status Banners */}
      {!canAcceptTasks && driver && (
        <div className="bg-orange-50 border-b border-orange-100 px-4 py-3">
          {!driver.profileComplete && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-orange-700">Profile Incomplete</p>
                <p className="text-[10px] text-orange-500">Complete your profile to accept tasks</p>
              </div>
              <a href="/driver/profile" className="text-[10px] bg-orange-600 text-white px-3 py-1.5 rounded-lg font-bold">Complete</a>
            </div>
          )}
          {driver.profileComplete && !driver.profileVerified && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-yellow-700">Documents Under Review</p>
                <p className="text-[10px] text-yellow-600">Admin is verifying your documents</p>
              </div>
              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-bold">Pending</span>
            </div>
          )}
          {driver.profileComplete && driver.profileVerified && (driver.walletBalance || 0) < 100 && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-green-800">Wallet Too Low (₱{(driver.walletBalance || 0).toFixed(0)})</p>
                <p className="text-[10px] text-green-500">Min ₱100 required to accept tasks</p>
              </div>
              <a href="/driver/wallet" className="text-[10px] bg-green-600 text-white px-3 py-1.5 rounded-lg font-bold">Top Up</a>
            </div>
          )}
        </div>
      )}

      {online && (
        <>
          {/* Stats */}
          <div className="bg-white px-4 py-3 border-b border-gray-100">
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center">
                <p className="text-lg font-bold text-orange-600">{availableOrders.length}</p>
                <p className="text-[10px] text-gray-400">Available</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-blue-600">{allActive.length}</p>
                <p className="text-[10px] text-gray-400">Active</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[#319F44]">{allHistory.length}</p>
                <p className="text-[10px] text-gray-400">Completed</p>
              </div>
            </div>
            {/* Earnings */}
            <div className="bg-gradient-to-r from-[#319F44]/10 to-[#59EBC6]/10 rounded-xl p-3 border border-[#319F44]/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[#319F44] font-semibold uppercase">Today's Earnings</p>
                  <p className="text-xl font-black text-[#267a34]">₱{todayEarnings.toFixed(2)}</p>
                  <p className="text-[10px] text-green-500">{todayDelivered.length} deliveries today</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-gray-500 font-semibold uppercase">Total Earnings</p>
                  <p className="text-lg font-bold text-gray-700">₱{totalEarnings.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">{allDelivered.length} total deliveries</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white flex border-b border-gray-200 sticky top-[60px] z-20">
            {([["available", "Available"], ["active", "Active"], ["history", "History"]] as [Tab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-3 text-xs font-bold transition-colors relative ${tab === key ? "text-[#319F44]" : "text-gray-400"}`}
              >
                {label}
                {key === "available" && availableOrders.length > 0 && (
                  <span className="absolute top-2 right-1/4 w-2 h-2 bg-[#319F44]/100 rounded-full animate-pulse" />
                )}
                {tab === key && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#319F44] rounded-full" />}
              </button>
            ))}
          </div>

          {/* Orders */}
          <div className="flex-1 p-4 space-y-3 pb-20">
            {displayOrders.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">{tab === "available" ? "📭" : tab === "active" ? "🛵" : "📋"}</p>
                <p className="text-gray-400 text-sm">
                  {tab === "available" ? "No available orders" : tab === "active" ? "No active deliveries" : "No delivery history"}
                </p>
                {tab === "available" && <p className="text-xs text-gray-300 mt-1">New orders will appear here when ready</p>}
              </div>
            ) : (
              displayOrders.map((order) => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Order Header */}
                  <div className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-sm text-gray-800">Order #{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-[10px] text-gray-400">{order.createdAt?.toLocaleString?.() || "Just now"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-[#319F44]">₱{(order.total || (order as any).totalPrice || 0).toFixed(2)}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        order.status === "ready_for_pickup" ? "bg-orange-100 text-orange-700" :
                        order.status === "rider_accepted" ? "bg-cyan-100 text-cyan-700" :
                        order.status === "rider_at_store" ? "bg-teal-100 text-teal-700" :
                        order.status === "rider_picked_up" || order.status === "out_for_delivery" ? "bg-blue-100 text-blue-700" :
                        order.status === "delivered" ? "bg-[#59EBC6]/20 text-[#267a34]" :
                        "bg-gray-100 text-gray-600"
                      }`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {/* Customer & Address */}
                  <div className="px-4 py-3">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm shrink-0">👤</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800">{order.customerName}</p>
                        <p className="text-xs text-gray-500">{order.customerPhone}</p>
                      </div>
                      {order.customerPhone && (
                        <a href={`tel:${order.customerPhone}`} className="w-8 h-8 bg-[#319F44]/10 rounded-full flex items-center justify-center text-sm shrink-0">📞</a>
                      )}
                    </div>

                    {/* Delivery Route - Tappable for Google Maps */}
                    <div className="space-y-2 mb-3">
                      {/* Pickup Address */}
                      {order.deliveryAddress && (
                        <a
                          href={order.deliveryLat && order.deliveryLng ? `https://www.google.com/maps/search/?api=1&query=${order.deliveryLat},${order.deliveryLng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress)}`}
                          target="_blank"
                          className="flex items-start gap-2 bg-blue-50 rounded-xl p-3 hover:bg-blue-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-blue-600 uppercase">Pickup / Store</p>
                            <p className="text-xs text-blue-700">Gruwcer Store</p>
                          </div>
                          <svg className="w-4 h-4 text-blue-400 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                      {/* Laundry: Customer pickup address */}
                      {(order as any).pickupAddress && (
                        <a
                          href={(order as any).pickupLat && (order as any).pickupLng ? `https://www.google.com/maps/search/?api=1&query=${(order as any).pickupLat},${(order as any).pickupLng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((order as any).pickupAddress)}`}
                          target="_blank"
                          className="flex items-start gap-2 bg-cyan-50 rounded-xl p-3 hover:bg-cyan-100 transition-colors"
                        >
                          <svg className="w-4 h-4 text-cyan-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          <div className="flex-1">
                            <p className="text-[10px] font-bold text-cyan-600 uppercase">Customer Address</p>
                            <p className="text-xs text-cyan-700">{(order as any).pickupAddress}</p>
                          </div>
                          <svg className="w-4 h-4 text-cyan-400 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </a>
                      )}
                      {/* Drop-off address */}
                      <a
                        href={order.deliveryLat && order.deliveryLng ? `https://www.google.com/maps/search/?api=1&query=${order.deliveryLat},${order.deliveryLng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress || (order as any).pickupAddress || "")}`}
                        target="_blank"
                        className="flex items-start gap-2 bg-[#319F44]/10 rounded-xl p-3 hover:bg-[#59EBC6]/20 transition-colors"
                      >
                        <svg className="w-4 h-4 text-green-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        <div className="flex-1">
                          <p className="text-[10px] font-bold text-[#267a34] uppercase">Drop-off / Delivery</p>
                          <p className="text-xs text-green-800">{order.deliveryAddress || (order as any).pickupAddress || ""}</p>
                        </div>
                        <svg className="w-4 h-4 text-green-400 mt-1 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </div>

                    {/* Items */}
                    {order.items && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Items ({order.items.reduce((s: number, i: any) => s + i.quantity, 0)})</p>
                        <div className="space-y-1">
                          {order.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between text-xs">
                              <span className="text-gray-600">{item.quantity}× {item.name}</span>
                              <span className="text-gray-400">₱{((item.price || 0) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Laundry order info */}
                    {(order as any).serviceName && !order.items && (
                      <div className="border-t border-gray-100 pt-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Laundry</p>
                        <p className="text-xs text-gray-600">{(order as any).serviceName} — {(order as any).weight}kg</p>
                        <p className="text-xs text-gray-400">₱{(order as any).totalPrice || (order as any).price}</p>
                      </div>
                    )}
                  </div>

                  {/* ═══ ACTION BUTTONS - RIDER FLOW ═══ */}
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                    {/* Available: Accept */}
                    {order.status === "ready_for_pickup" && !order.driverId && (
                      <button
                        onClick={() => canAcceptTasks && acceptOrder(order.id)}
                        disabled={!canAcceptTasks}
                        className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${canAcceptTasks ? "bg-[#319F44] text-white hover:bg-[#267a34]" : "bg-gray-200 text-gray-400 cursor-not-allowed"}`}
                      >
                        {canAcceptTasks ? "✓ Accept Delivery Task" : "🔒 Complete profile & top up to accept"}
                      </button>
                    )}

                    {/* Accepted: Navigate to Store */}
                    {order.status === "rider_accepted" && (order as any)._type === "grocery" && (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 mb-2">Navigate to the store to pick up the order</p>
                        <button
                          onClick={() => arrivedAtStore(order.id)}
                          className="w-full bg-teal-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2"
                        >
                          🏪 Arrived at Store
                        </button>
                      </div>
                    )}

                    {/* At Store: Pick Up */}
                    {order.status === "rider_at_store" && (order as any)._type === "grocery" && (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 mb-2">Collect the order from the store</p>
                        <button
                          onClick={() => pickedUp(order.id)}
                          className="w-full bg-indigo-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                        >
                          📦 Picked Up - Start Delivery
                        </button>
                      </div>
                    )}

                    {/* Picked Up / Out for Delivery */}
                    {(order.status === "rider_picked_up" || order.status === "out_for_delivery") && (order as any)._type === "grocery" && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleLocation(order.id)}
                            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors ${
                              sharing === order.id ? "bg-[#59EBC6]/20 text-green-800 border border-green-200" : "bg-blue-50 text-blue-700 border border-blue-200"
                            }`}
                          >
                            {sharing === order.id ? "⏹ Stop Sharing" : "📡 Share Location"}
                          </button>
                          <button
                            onClick={() => markDelivered(order.id)}
                            className="flex-1 bg-green-600 text-white py-3 rounded-xl text-xs font-bold hover:bg-green-700 transition-colors"
                          >
                            ✓ Delivered
                          </button>
                        </div>
                        {order.deliveryLat && order.deliveryLng && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${order.deliveryLat},${order.deliveryLng}`}
                            target="_blank"
                            className="block w-full text-center bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-medium"
                          >
                            🗺️ Open in Google Maps
                          </a>
                        )}
                      </div>
                    )}

                    {/* Delivered */}
                    {order.status === "delivered" && (
                      <div className="text-center py-2">
                        <span className="text-[#319F44] text-xs font-bold">✓ Delivery Completed</span>
                      </div>
                    )}

                    {/* ═══ LAUNDRY ORDER ACTIONS ═══ */}
                    {order.status === "rider_to_customer" && (order as any)._type === "laundry" && (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 mb-2">🧳 Pick up laundry from customer</p>
                        <button onClick={() => fetch(`/api/laundry-orders/${order.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'rider_picked_up' }) })} className="w-full bg-cyan-600 text-white py-3.5 rounded-xl text-sm font-bold">
                          ✓ Picked Up from Customer
                        </button>
                      </div>
                    )}
                    {order.status === "rider_picked_up" && (order as any).partnerId && (order as any)._type === "laundry" && (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 mb-2">🧺 Deliver laundry to shop</p>
                        <button onClick={() => fetch(`/api/laundry-orders/${order.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'at_laundromat' }) })} className="w-full bg-purple-600 text-white py-3.5 rounded-xl text-sm font-bold">
                          ✓ Delivered to Laundry Shop
                        </button>
                      </div>
                    )}
                    {order.status === "rider_to_laundromat" && (order as any)._type === "laundry" && (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 mb-2">🧺 Deliver laundry to shop</p>
                        <button onClick={() => fetch(`/api/laundry-orders/${order.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'at_laundromat' }) })} className="w-full bg-purple-600 text-white py-3.5 rounded-xl text-sm font-bold">
                          ✓ Delivered to Laundry Shop
                        </button>
                      </div>
                    )}
                    {order.status === "rider_return_pickup" && (order as any)._type === "laundry" && (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 mb-2">🧺 Pick up clean laundry from shop</p>
                        <button onClick={() => fetch(`/api/laundry-orders/${order.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'rider_returning' }) })} className="w-full bg-teal-600 text-white py-3.5 rounded-xl text-sm font-bold">
                          ✓ Picked Up Clean Laundry
                        </button>
                      </div>
                    )}
                    {order.status === "rider_returning" && (order as any)._type === "laundry" && (
                      <div className="space-y-2">
                        <p className="text-xs text-center text-gray-500 mb-2">📦 Return clean laundry to customer</p>
                        <button onClick={async () => {
                          await fetch(`/api/laundry-orders/${order.id}`, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'delivered' }) })
                          // Deduct rider commission
                          if (driver) { const commission = Math.round(riderFee * 20 / 100); await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: driver.id, ownerType: "rider", type: "commission_deduction", amount: -commission, orderId: order.id, note: `20% commission` }) }) }
                          // Deduct partner commission
                          if ((order as any).partnerId) { const partnerCommission = Math.round(((order as any).totalPrice || (order as any).price || 0) * 15 / 100); await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: (order as any).partnerId, ownerType: "partner", type: "commission_deduction", amount: -partnerCommission, orderId: order.id, note: `15% commission` }) }) }
                        }} className="w-full bg-green-600 text-white py-3.5 rounded-xl text-sm font-bold">
                          ✓ Delivered to Customer
                        </button>
                        {order.pickupLat && order.pickupLng && (
                          <a href={`https://www.google.com/maps/dir/?api=1&destination=${order.pickupLat},${order.pickupLng}`} target="_blank" className="block w-full text-center bg-white border border-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-medium">
                            🗺️ Navigate to Customer
                          </a>
                        )}
                      </div>
                    )}

                    {/* Chat Button */}
                    {["rider_accepted", "rider_at_store", "rider_picked_up", "out_for_delivery"].includes(order.status) && (
                      <button
                        onClick={() => setChatOrderId(chatOrderId === order.id ? null : order.id)}
                        className="w-full mt-2 flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-2.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        💬 Chat with Customer
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ═══ CHAT DRAWER ═══ */}
          {chatOrderId && (
            <div className="fixed inset-0 z-[100] flex flex-col">
              <div className="absolute inset-0 bg-black/50" onClick={() => setChatOrderId(null)} />
              <div className="relative mt-auto bg-white rounded-t-2xl w-full max-w-lg mx-auto h-[65vh] flex flex-col overflow-hidden">
                <div className="bg-[#319F44] px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Customer Chat</p>
                      <p className="text-white/60 text-[10px]">Order #{chatOrderId.slice(-6).toUpperCase()}</p>
                    </div>
                  </div>
                  <button onClick={() => setChatOrderId(null)} className="text-white/80 hover:text-white text-xl">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-10">
                      <p className="text-3xl mb-2">💬</p>
                      <p className="text-gray-400 text-sm">No messages yet</p>
                    </div>
                  ) : (
                    chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.senderRole === "driver" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${msg.senderRole === "driver" ? "bg-[#319F44] text-white rounded-br-md" : "bg-white text-gray-800 border border-gray-200 rounded-bl-md"}`}>
                          {msg.senderRole !== "driver" && <p className="text-[10px] font-bold mb-0.5 text-gray-400">{msg.senderName}</p>}
                          <p className="text-sm">{msg.message}</p>
                          <p className={`text-[9px] mt-1 ${msg.senderRole === "driver" ? "text-white/50" : "text-gray-300"}`}>
                            {msg.createdAt?.toLocaleTimeString?.([], { hour: "2-digit", minute: "2-digit" }) || "now"}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="p-3 border-t border-gray-200 bg-white flex gap-2 flex-shrink-0">
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                    className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm outline-none focus:border-[#319F44]"
                  />
                  <button
                    onClick={handleSendChat}
                    disabled={!chatInput.trim()}
                    className="w-10 h-10 bg-[#319F44] text-white rounded-full flex items-center justify-center hover:bg-[#267a34] transition-colors disabled:opacity-40"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Nav */}
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 grid grid-cols-3 py-2 z-30">
            <button onClick={() => setTab("available")} className={`flex flex-col items-center gap-0.5 py-1 ${tab === "available" ? "text-[#319F44]" : "text-gray-400"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              <span className="text-[10px] font-medium">Available</span>
            </button>
            <button onClick={() => setTab("active")} className={`flex flex-col items-center gap-0.5 py-1 ${tab === "active" ? "text-[#319F44]" : "text-gray-400"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
              <span className="text-[10px] font-medium">Active</span>
            </button>
            <button onClick={() => setTab("history")} className={`flex flex-col items-center gap-0.5 py-1 ${tab === "history" ? "text-[#319F44]" : "text-gray-400"}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span className="text-[10px] font-medium">History</span>
            </button>
          </nav>
        </>
      )}
    </main>
  )
}
