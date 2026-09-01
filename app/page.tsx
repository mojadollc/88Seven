"use client"

import { useEffect, useState } from "react"
import { getUser, getToken } from "@/lib/auth"

const SERVICES = [
  { id: "grocery", name: "Grocery", icon: "https://img.icons8.com/3d-fluency/94/shopping-cart.png", href: "/grocery", available: true },
  { id: "laundry", name: "Laundry", icon: "https://img.icons8.com/3d-fluency/94/washing-machine.png", href: "/laundry", available: true },
  { id: "services", name: "Services", icon: "https://img.icons8.com/3d-fluency/94/maintenance.png", href: "/home-services", available: true },
  { id: "travel", name: "Travel", icon: "https://img.icons8.com/3d-fluency/94/airplane-mode-on.png", href: "/travel", available: true },
  { id: "healthcare", name: "Clinics", icon: "https://img.icons8.com/3d-fluency/94/hospital.png", href: "#", available: false },
  { id: "food", name: "Food", icon: "https://img.icons8.com/3d-fluency/94/hamburger.png", href: "#", available: false },
  { id: "bills", name: "Bills", icon: "https://img.icons8.com/3d-fluency/94/bill.png", href: "#", available: false },
  { id: "more", name: "More", icon: "https://img.icons8.com/3d-fluency/94/menu.png", href: "#", available: false },
]

export default function HomePage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [banners, setBanners] = useState<{ id: string; title: string; subtitle: string; imageUrl: string; bgColor: string; link: string }[]>([])
  const [currentBanner, setCurrentBanner] = useState(0)
  const [partners, setPartners] = useState<any[]>([])
  const [promos, setPromos] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [address, setAddress] = useState("")
  const [detecting, setDetecting] = useState(false)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [savedAddresses, setSavedAddresses] = useState<any[]>([])
  const [addingNew, setAddingNew] = useState(false)
  const [newAddr, setNewAddr] = useState({ label: "Home", address: "", lat: 0, lng: 0 })
  const [savingAddr, setSavingAddr] = useState(false)
  const [locatingNew, setLocatingNew] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [activeOrders, setActiveOrders] = useState<{ id: string; type: "grocery" | "laundry" | "service"; status: string; name: string; total: number; createdAt: any }[]>([])
  const [showOrderTracker, setShowOrderTracker] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const dismissed = sessionStorage.getItem("install-dismissed")
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone
    setIsStandalone(!!standalone)
    if (standalone || dismissed) return
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); setTimeout(() => setShowInstall(true), 2000) }
    window.addEventListener("beforeinstallprompt", handler)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    if (isIOS && !standalone) setTimeout(() => setShowInstall(true), 3000)
    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("user_location")
    if (saved) setAddress(JSON.parse(saved).address)
    else detectLocation()
  }, [])

  const detectLocation = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          const data = await res.json()
          const addr = data.address?.road ? `${data.address.road}, ${data.address.city || data.address.town || ""}` : data.display_name?.split(",").slice(0, 2).join(",") || ""
          setAddress(addr)
          localStorage.setItem("user_location", JSON.stringify({ address: addr, lat: pos.coords.latitude, lng: pos.coords.longitude }))
        } catch { setAddress("Location detected") }
        setDetecting(false)
      },
      () => setDetecting(false),
      { enableHighAccuracy: true }
    )
  }

  useEffect(() => {
    const u = getUser()
    if (!u) return
    setUser(u)
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(p => { if (p) { setProfile(p); if (p.savedAddresses) setSavedAddresses(p.savedAddresses) } })
    fetch(`/api/notifications?recipientType=customer&recipientId=${u.id}`)
      .then(r => r.ok ? r.json() : []).then(setNotifications)
  }, [])

  useEffect(() => {
    if (!user) { setActiveOrders([]); return }
    const activeStatuses = ["pending","confirmed","preparing","ready_for_pickup","rider_accepted","rider_at_store","rider_picked_up","out_for_delivery"]
    const laundryActiveStatuses = ["pending","accepted","rider_to_customer","rider_picked_up","rider_to_laundromat","at_laundromat","washing","ready","rider_return_pickup","rider_returning"]
    const poll = async () => {
      const [gr, la] = await Promise.all([
        fetch(`/api/orders?customerId=${user.id}`).then(r => r.ok ? r.json() : []),
        fetch(`/api/laundry-orders?customerId=${user.id}`).then(r => r.ok ? r.json() : []),
      ])
      const grocery = gr.filter((o: any) => activeStatuses.includes(o.status)).map((o: any) => ({ id: o.id, type: "grocery" as const, status: o.status, name: `${o.items?.length || 0} items`, total: o.total || 0, createdAt: o.createdAt }))
      const laundry = la.filter((o: any) => laundryActiveStatuses.includes(o.status)).map((o: any) => ({ id: o.id, type: "laundry" as const, status: o.status, name: o.serviceName || "Laundry", total: o.totalPrice || 0, createdAt: o.createdAt }))
      setActiveOrders([...grocery, ...laundry])
    }
    poll()
    const iv = setInterval(poll, 10000)
    return () => clearInterval(iv)
  }, [user])

  useEffect(() => {
    fetch("/api/hero").then(r => r.ok ? r.json() : []).then((data: any[]) => {
      setBanners(data.length > 0 ? data.map((s: any) => ({ id: s.id, title: s.title || "", subtitle: s.description || s.subtitle || "", imageUrl: s.imageUrl || "", bgColor: s.bgColor || "#16A34A", link: s.link || "/grocery" })) : [
        { id: "1", title: "Free Delivery", subtitle: "On orders ₱1,000+", imageUrl: "", bgColor: "#16A34A", link: "/grocery" },
        { id: "2", title: "Laundry Pickup", subtitle: "We'll handle the rest", imageUrl: "", bgColor: "#1a56db", link: "/laundry" },
        { id: "3", title: "Home Services", subtitle: "Aircon, plumbing & more", imageUrl: "", bgColor: "#0d9488", link: "/home-services" },
      ])
    }).catch(() => {})
    fetch("/api/promos").then(r => r.ok ? r.json() : []).then(setPromos).catch(() => {})
    fetch("/api/users?role=partner").then(r => r.ok ? r.json() : []).then((p: any[]) => setPartners(p.filter(x => x.status === "active"))).catch(() => {})
  }, [])

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(() => setCurrentBanner((c) => (c + 1) % banners.length), 4000)
    return () => clearInterval(t)
  }, [banners.length])

  const unread = notifications.filter((n) => !n.read).length

  const markAllRead = () => {
    if (!user) return
    fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAllRead", recipientType: "customer", recipientId: user.id }) })
      .then(() => setNotifications(n => n.map(x => ({ ...x, read: true }))))
  }

  const selectAddress = (addr: any) => {
    setAddress(addr.address)
    localStorage.setItem("user_location", JSON.stringify({ address: addr.address, lat: addr.lat, lng: addr.lng }))
    setShowAddressModal(false)
  }

  const detectForNew = () => {
    if (!navigator.geolocation) return
    setLocatingNew(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
          const data = await res.json()
          const addr = data.display_name?.split(",").slice(0, 3).join(",") || `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`
          setNewAddr((p) => ({ ...p, address: addr, lat: pos.coords.latitude, lng: pos.coords.longitude }))
        } catch {}
        setLocatingNew(false)
      },
      () => setLocatingNew(false),
      { enableHighAccuracy: true }
    )
  }

  const saveNewAddress = async () => {
    if (!newAddr.address.trim()) return
    setSavingAddr(true)
    const entry = { id: Date.now().toString(), label: newAddr.label, address: newAddr.address, lat: newAddr.lat, lng: newAddr.lng }
    const updated = [...savedAddresses, entry]
    setSavedAddresses(updated)
    if (user) await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ savedAddresses: updated }) })
    selectAddress(entry)
    setAddingNew(false)
    setNewAddr({ label: "Home", address: "", lat: 0, lng: 0 })
    setSavingAddr(false)
  }

  const deleteAddress = async (id: string) => {
    const updated = savedAddresses.filter((a: any) => a.id !== id)
    setSavedAddresses(updated)
    if (user) await fetch("/api/users/me", { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` }, body: JSON.stringify({ savedAddresses: updated }) })
  }

  return (
    <main className="min-h-screen bg-gray-50" suppressHydrationWarning>

      {/* ── HEADER ── */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          {/* Desktop */}
          <div className="hidden md:flex items-center justify-between h-16">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#16A34A] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-sm">G</span>
              </div>
              <span className="font-black text-xl text-gray-900 tracking-tight">Gruwcer</span>
            </a>
            <div className="flex-1 max-w-md mx-8">
              <a href="/grocery" className="flex items-center gap-2.5 bg-gray-100 hover:bg-gray-200 transition-colors rounded-xl px-4 py-2.5">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <span className="text-sm text-gray-400">Search groceries, services...</span>
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddressModal(true)} className="flex items-center gap-1.5 text-gray-600 hover:text-[#16A34A] text-sm px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-4 h-4 text-[#16A34A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="max-w-[140px] truncate">{detecting ? "Detecting..." : address || "Set location"}</span>
              </button>
              <div className="w-px h-5 bg-gray-200" />
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {mounted && unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
              </button>
              <a href="/account" className="flex items-center gap-2 bg-[#16A34A] hover:bg-[#15803d] text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {mounted && profile?.name ? profile.name.split(" ")[0] : "Account"}
              </a>
            </div>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center justify-between h-14">
            <a href="/" className="flex items-center gap-1.5">
              <div className="w-7 h-7 bg-[#16A34A] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">G</span>
              </div>
              <span className="font-black text-lg text-gray-900 tracking-tight">Gruwcer</span>
            </a>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAddressModal(true)} className="flex items-center gap-1 text-gray-500 text-xs max-w-[120px]">
                <svg className="w-3.5 h-3.5 text-[#16A34A] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="truncate">{detecting ? "Detecting..." : address || "Set location"}</span>
              </button>
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-1.5">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {mounted && unread > 0 && <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
              </button>
              <a href="/account" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              </a>
            </div>
          </div>

          {/* Mobile search bar */}
          <div className="md:hidden pb-3">
            <a href="/grocery" className="flex items-center gap-2.5 bg-gray-100 rounded-xl px-4 py-2.5">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <span className="text-sm text-gray-400">Search groceries, services...</span>
            </a>
          </div>
        </div>

        {/* Notifications dropdown */}
        {showNotifs && (
          <div className="absolute right-4 md:right-6 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-bold text-gray-800">Notifications</span>
              {mounted && unread > 0 && user && <button onClick={markAllRead} className="text-xs text-[#16A34A] font-semibold">Mark all read</button>}
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="p-6 text-sm text-gray-400 text-center">No notifications yet</p>
              ) : (
                notifications.slice(0, 8).map((n) => (
                  <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? "bg-green-50/60" : ""}`}>
                    <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO BANNER ── */}
      {mounted && banners.length > 0 && (
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-6">
            <div
              className="relative rounded-2xl overflow-hidden h-[180px] md:h-[340px] cursor-pointer"
              style={{
                backgroundColor: banners[currentBanner]?.bgColor || "#16A34A",
                backgroundImage: banners[currentBanner]?.imageUrl
                  ? `linear-gradient(105deg,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.1) 60%),url(${banners[currentBanner].imageUrl})`
                  : `linear-gradient(135deg, ${banners[currentBanner]?.bgColor || "#16A34A"} 0%, rgba(0,0,0,0.3) 100%)`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              {/* Decorative circles */}
              <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full" />
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full" />

              <a href={banners[currentBanner]?.link || "#"} className="absolute inset-0 flex flex-col justify-center p-6 md:p-12">
                <span className="inline-flex self-start items-center bg-white/20 backdrop-blur-sm border border-white/30 rounded-full px-3 py-1 mb-3 text-white text-[10px] md:text-xs font-bold uppercase tracking-widest">
                  ✦ Featured
                </span>
                <h2 className="text-white font-black text-2xl md:text-5xl leading-tight drop-shadow-sm max-w-lg">
                  {banners[currentBanner]?.title}
                </h2>
                <p className="text-white/80 text-sm md:text-lg mt-2 max-w-sm drop-shadow">
                  {banners[currentBanner]?.subtitle}
                </p>
                <span className="mt-4 self-start bg-white text-gray-900 text-xs md:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg hover:bg-gray-50 transition-colors">
                  Order now →
                </span>
              </a>

              {banners.length > 1 && (
                <div className="absolute bottom-4 right-4 flex gap-1.5">
                  {banners.map((_, i) => (
                    <button key={i} onClick={() => setCurrentBanner(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === currentBanner ? "bg-white w-6" : "bg-white/40 w-1.5"}`} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 pb-24 md:pb-16">

        {/* ── SERVICES ── */}
        <div className="mt-6 md:mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base md:text-lg font-bold text-gray-900">Our Services</h2>
          </div>
          <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
            {SERVICES.map((s) => (
              <a
                key={s.id}
                href={s.available ? s.href : undefined}
                className={`relative flex flex-col items-center gap-2 p-3 md:p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all ${s.available ? "hover:shadow-md hover:-translate-y-0.5 hover:border-[#16A34A]/20 cursor-pointer" : "opacity-50 cursor-default"}`}
              >
                {!s.available && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-[8px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap">SOON</span>
                )}
                <img src={s.icon} alt={s.name} className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                <span className="text-[10px] md:text-xs text-gray-600 font-medium text-center leading-tight">{s.name}</span>
              </a>
            ))}
          </div>
        </div>

        {/* ── FEATURED CARDS ── */}
        <div className="mt-6 md:mt-8">
          <h2 className="text-base md:text-lg font-bold text-gray-900 mb-4">Quick Order</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <a href="/grocery" className="group relative bg-gradient-to-br from-emerald-500 to-green-700 rounded-2xl p-5 md:p-6 text-white overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <img src="https://img.icons8.com/3d-fluency/94/shopping-cart.png" className="w-10 h-10 mb-3 object-contain" alt="Grocery" />
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Same-day delivery</p>
                <p className="text-xl font-black mt-1">Grocery</p>
                <p className="text-white/80 text-sm mt-1">Fresh produce & daily essentials</p>
                <span className="inline-flex items-center gap-1 mt-4 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  Shop now <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </span>
              </div>
            </a>

            <a href="/laundry" className="group relative bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-5 md:p-6 text-white overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <img src="https://img.icons8.com/3d-fluency/94/washing-machine.png" className="w-10 h-10 mb-3 object-contain" alt="Laundry" />
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Pickup & delivery</p>
                <p className="text-xl font-black mt-1">Laundry</p>
                <p className="text-white/80 text-sm mt-1">Wash, dry & fold service</p>
                <span className="inline-flex items-center gap-1 mt-4 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  Book now <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </span>
              </div>
            </a>

            <a href="/home-services" className="group relative bg-gradient-to-br from-teal-500 to-cyan-700 rounded-2xl p-5 md:p-6 text-white overflow-hidden hover:shadow-xl transition-all hover:-translate-y-0.5">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <img src="https://img.icons8.com/3d-fluency/94/maintenance.png" className="w-10 h-10 mb-3 object-contain" alt="Services" />
                <p className="text-white/70 text-xs font-semibold uppercase tracking-wider">Book a pro</p>
                <p className="text-xl font-black mt-1">Home Services</p>
                <p className="text-white/80 text-sm mt-1">Aircon, plumbing, electrical</p>
                <span className="inline-flex items-center gap-1 mt-4 bg-white/20 hover:bg-white/30 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors">
                  Book now <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </span>
              </div>
            </a>
          </div>
        </div>

        {/* ── PROMOS ── */}
        {mounted && promos.length > 0 && (
          <div className="mt-6 md:mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Deals for you</h2>
              <span className="text-xs text-[#16A34A] font-semibold">Limited time</span>
            </div>
            <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible scrollbar-hide pb-1">
              {promos.map((p) => (
                <div key={p.id} className="flex-shrink-0 min-w-[220px] md:min-w-0 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-[#16A34A] to-emerald-600 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-white font-black text-sm">{p.discountPercent}%</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">{p.title}</p>
                      {p.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PARTNERS ── */}
        {mounted && partners.length > 0 && (
          <div className="mt-6 md:mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base md:text-lg font-bold text-gray-900">Laundry Partners</h2>
              <a href="/laundry" className="text-xs text-[#16A34A] font-semibold hover:underline">See all</a>
            </div>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
              {partners.map((p) => (
                <a key={p.id} href="/laundry" className="flex flex-col items-center gap-2 min-w-[72px] group">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-blue-50 border border-gray-100 shadow-sm flex items-center justify-center group-hover:shadow-md transition-shadow">
                    {p.logoUrl ? <img src={p.logoUrl} alt={p.shopName} className="w-full h-full object-cover" /> : <span className="text-blue-600 font-black text-lg">{p.shopName.charAt(0)}</span>}
                  </div>
                  <p className="text-[10px] text-gray-600 font-medium text-center leading-tight line-clamp-2 max-w-[72px]">{p.shopName}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* ── HOW IT WORKS ── */}
        <div className="mt-8 md:mt-10">
          <h2 className="text-base md:text-lg font-bold text-gray-900 mb-4">How it works</h2>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {[
              { step: "01", title: "Choose", desc: "Pick a service or browse products", icon: "https://img.icons8.com/3d-fluency/94/finger.png" },
              { step: "02", title: "Order", desc: "Add to cart and pay securely", icon: "https://img.icons8.com/3d-fluency/94/shopping-cart.png" },
              { step: "03", title: "Enjoy", desc: "Delivered fast to your door", icon: "https://img.icons8.com/3d-fluency/94/rocket.png" },
            ].map((s, i) => (
              <div key={s.step} className="bg-white rounded-2xl p-4 md:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-center">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-gray-50 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <img src={s.icon} alt={s.title} className="w-7 h-7 md:w-8 md:h-8 object-contain" />
                </div>
                <span className="text-[10px] font-black text-[#16A34A] tracking-widest">{s.step}</span>
                <p className="font-bold text-sm md:text-base text-gray-900 mt-0.5">{s.title}</p>
                <p className="text-[10px] md:text-xs text-gray-400 mt-1 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="mt-10 md:mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-[#16A34A] rounded-lg flex items-center justify-center">
                <span className="text-white font-black text-xs">G</span>
              </div>
              <span className="font-black text-lg text-gray-900 tracking-tight">Gruwcer</span>
              <span className="text-gray-300 text-sm ml-1">— Your everyday super app</span>
            </div>
            <div className="flex items-center gap-6">
              {[["Grocery", "/grocery"], ["Laundry", "/laundry"], ["Services", "/home-services"], ["Account", "/account"], ["Sign In", "/auth"]].map(([label, href]) => (
                <a key={label} href={href} className="text-sm text-gray-400 hover:text-[#16A34A] transition-colors">{label}</a>
              ))}
            </div>
          </div>
          <p className="text-xs text-gray-300 mt-6 text-center md:text-left">© {new Date().getFullYear()} Gruwcer. All rights reserved.</p>
        </div>
      </div>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom" suppressHydrationWarning>
        <div className="grid grid-cols-4 py-2">
          <a href="/" className="flex flex-col items-center gap-0.5 py-1 text-[#16A34A]">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[10px] font-bold">Home</span>
          </a>
          <a href="/grocery" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <span className="text-[10px] font-medium">Grocery</span>
          </a>
          <a href="/laundry" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            <span className="text-[10px] font-medium">Laundry</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-medium">Account</span>
          </a>
        </div>
      </nav>

      {/* ── ACTIVE ORDER TRACKER ── */}
      {mounted && activeOrders.length > 0 && (
        <>
          {!showOrderTracker && (
            <button onClick={() => setShowOrderTracker(true)} className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-white border border-gray-200 shadow-2xl rounded-full pl-14 pr-5 py-3 flex items-center gap-3 hover:shadow-xl transition-shadow">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#16A34A] to-emerald-600 border-2 border-white flex items-center justify-center z-30 shadow-md">
                  <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/></svg>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white flex items-center justify-center -ml-2 z-20 shadow-md">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M19.5 3.5L18 2l-1.5 1.5L15 2l-1.5 1.5L12 2l-1.5 1.5L9 2 7.5 3.5 6 2 4.5 3.5 3 2v20l1.5-1.5L6 22l1.5-1.5L9 22l1.5-1.5L12 22l1.5-1.5L15 22l1.5-1.5L18 22l1.5-1.5L21 22V2l-1.5 1.5zM19 19H5V5h14v14zM6 15h12v2H6zm0-4h12v2H6zm0-4h12v2H6z"/></svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">{activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}</p>
                <p className="text-xs text-gray-400">Tap to track</p>
              </div>
              <div className="w-5 h-5 bg-[#16A34A] rounded-full flex items-center justify-center ml-1">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
              </div>
            </button>
          )}
          {showOrderTracker && (
            <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[60] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-[#16A34A] rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-gray-900">{activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}</span>
                </div>
                <button onClick={() => setShowOrderTracker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {activeOrders.map((order) => {
                  const href = order.type === "grocery" ? `/order?id=${order.id}` : order.type === "laundry" ? "/laundry" : "/home-services"
                  const icon = order.type === "grocery" ? "https://img.icons8.com/3d-fluency/94/shopping-cart.png" : order.type === "laundry" ? "https://img.icons8.com/3d-fluency/94/washing-machine.png" : "https://img.icons8.com/3d-fluency/94/maintenance.png"
                  const progressMap: Record<string, number> = { pending: 15, confirmed: 30, preparing: 45, ready_for_pickup: 60, rider_picked_up: 75, out_for_delivery: 85, washing: 65 }
                  const progress = progressMap[order.status] || 20
                  return (
                    <a key={`${order.type}-${order.id}`} href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <img src={icon} alt={order.type} className="w-8 h-8 object-contain shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800 truncate">{order.name}</p>
                          <p className="text-xs font-bold text-gray-600 ml-2">₱{order.total}</p>
                        </div>
                        <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#16A34A] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 capitalize">{order.status.replace(/_/g, " ")}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </a>
                  )
                })}
              </div>
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                <a href="/account" className="text-xs text-[#16A34A] font-bold text-center block">View all orders →</a>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── ADDRESS MODAL ── */}
      {showAddressModal && (
        <div className="fixed inset-0 z-[200] flex flex-col justify-end md:items-center md:justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowAddressModal(false); setAddingNew(false) }} />
          <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full max-w-lg mx-auto overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-bold text-base text-gray-900">Deliver to</h2>
              <button onClick={() => { setShowAddressModal(false); setAddingNew(false) }} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors">&times;</button>
            </div>
            <div className="px-5 py-4 max-h-[75vh] overflow-y-auto space-y-3">
              <button onClick={() => { detectLocation(); setShowAddressModal(false) }} className="w-full flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl px-4 py-3 hover:bg-green-100 transition-colors">
                <div className="w-9 h-9 bg-[#16A34A] rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[#16A34A]">Use current location</p>
                  <p className="text-xs text-gray-400">Detect via GPS</p>
                </div>
              </button>

              {savedAddresses.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Saved</p>
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => {
                      const icons: Record<string, string> = { Home: "https://img.icons8.com/3d-fluency/94/home.png", Office: "https://img.icons8.com/3d-fluency/94/office-building.png", Work: "https://img.icons8.com/3d-fluency/94/briefcase.png", Other: "https://img.icons8.com/3d-fluency/94/map-pin.png" }
                      const active = address === addr.address
                      return (
                        <div key={addr.id} onClick={() => selectAddress(addr)} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${active ? "border-[#16A34A] bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <img src={icons[addr.label] || icons.Other} alt={addr.label} className="w-7 h-7 shrink-0 object-contain" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800">{addr.label}</p>
                            <p className="text-xs text-gray-500 truncate">{addr.address}</p>
                          </div>
                          {active && <div className="w-2 h-2 bg-[#16A34A] rounded-full shrink-0" />}
                          <button onClick={(e) => { e.stopPropagation(); deleteAddress(addr.id) }} className="text-gray-300 hover:text-red-400 text-xl leading-none shrink-0">&times;</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!addingNew ? (
                <button onClick={() => setAddingNew(true)} className="w-full flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 hover:border-[#16A34A] transition-colors">
                  <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </div>
                  <span className="text-sm font-medium text-gray-500">Add new address</span>
                </button>
              ) : (
                <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-gray-700">New Address</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(["Home", "Office", "Work", "Other"] as const).map((lbl) => {
                      const lblIcons: Record<string, string> = { Home: "https://img.icons8.com/3d-fluency/94/home.png", Office: "https://img.icons8.com/3d-fluency/94/office-building.png", Work: "https://img.icons8.com/3d-fluency/94/briefcase.png", Other: "https://img.icons8.com/3d-fluency/94/map-pin.png" }
                      return (
                        <button key={lbl} onClick={() => setNewAddr((p) => ({ ...p, label: lbl }))} className={`py-2 rounded-xl text-xs font-bold border transition-colors ${newAddr.label === lbl ? "bg-[#16A34A] text-white border-[#16A34A]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                          <img src={lblIcons[lbl]} alt={lbl} className="w-5 h-5 mx-auto mb-0.5 object-contain" />{lbl}
                        </button>
                      )
                    })}
                  </div>
                  <textarea placeholder="Enter full address..." value={newAddr.address} onChange={(e) => setNewAddr((p) => ({ ...p, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#16A34A] resize-none" rows={2} />
                  <button onClick={detectForNew} disabled={locatingNew} className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-200 bg-blue-50 text-blue-600 rounded-xl py-2 text-xs font-medium">
                    {locatingNew ? "Detecting..." : "📍 Use current location"}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingNew(false); setNewAddr({ label: "Home", address: "", lat: 0, lng: 0 }) }} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-medium">Cancel</button>
                    <button onClick={saveNewAddress} disabled={savingAddr || !newAddr.address.trim()} className="flex-1 bg-[#16A34A] text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-40">{savingAddr ? "Saving..." : "Save Address"}</button>
                  </div>
                </div>
              )}
              {mounted && !user && (
                <p className="text-xs text-center text-gray-400 pb-2"><a href="/auth" className="text-[#16A34A] font-bold">Sign in</a> to save addresses across devices</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── PWA INSTALL ── */}
      {mounted && showInstall && !isStandalone && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowInstall(false); sessionStorage.setItem("install-dismissed", "1") }} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-[#16A34A] to-[#15803d] px-6 pt-8 pb-10 text-center relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-[#16A34A] rounded-lg flex items-center justify-center">
                  <span className="text-white font-black text-sm">G</span>
                </div>
              </div>
              <h2 className="text-white font-black text-xl">Install Gruwcer</h2>
              <p className="text-white/70 text-xs mt-1">Get the full app experience</p>
            </div>
            <div className="px-6 -mt-5 relative">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {[
                  { icon: "https://img.icons8.com/3d-fluency/94/lightning-bolt.png", text: "Faster loading & instant access" },
                  { icon: "https://img.icons8.com/3d-fluency/94/appointment-reminders.png", text: "Order notifications & updates" },
                  { icon: "https://img.icons8.com/3d-fluency/94/home.png", text: "Launch from your home screen" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-3">
                    <img src={b.icon} alt="" className="w-7 h-7 object-contain shrink-0" />
                    <p className="text-sm text-gray-700">{b.text}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 py-5 space-y-2">
              {deferredPrompt ? (
                <button onClick={async () => { deferredPrompt.prompt(); const { outcome } = await deferredPrompt.userChoice; if (outcome === "accepted") setShowInstall(false); setDeferredPrompt(null) }} className="w-full bg-[#FF8A00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#e07800] transition-colors flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Install App
                </button>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-sm font-bold text-gray-800 mb-1">Install on iPhone / iPad</p>
                  <p className="text-xs text-gray-500">Tap Share → <span className="font-bold text-gray-700">Add to Home Screen</span></p>
                </div>
              )}
              <button onClick={() => { setShowInstall(false); sessionStorage.setItem("install-dismissed", "1") }} className="w-full text-center text-sm text-gray-400 py-2 hover:text-gray-600">Maybe later</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
