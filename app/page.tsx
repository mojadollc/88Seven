"use client"

import { useEffect, useState } from "react"
import { getUser, getToken } from "@/lib/auth"

const SERVICES = [
  { id: "grocery", name: "Grocery", icon: "🛒", href: "/grocery", available: true, color: "from-teal-500 to-cyan-500", desc: "Fresh produce & daily essentials", badge: "Same-day delivery" },
  { id: "laundry", name: "Laundry", icon: "👕", href: "/laundry", available: true, color: "from-blue-500 to-indigo-600", desc: "Wash, dry & fold service", badge: "Pickup & delivery" },
  { id: "services", name: "Home Services", icon: "🔧", href: "/home-services", available: true, color: "from-teal-500 to-cyan-600", desc: "Aircon, plumbing, electrical", badge: "Book a pro" },
  { id: "travel", name: "Hotel & Flights", icon: "✈️", href: "/travel", available: true, color: "from-sky-500 to-blue-600", desc: "Hotels, flights & packages", badge: "Best rates" },
  { id: "food", name: "Food To Go", icon: "🍔", href: "#", available: false, color: "from-orange-500 to-red-500", desc: "Restaurant delivery", badge: "Coming soon" },
  { id: "bills", name: "Bills Payment", icon: "💳", href: "#", available: false, color: "from-purple-500 to-violet-600", desc: "Pay bills & load credits", badge: "Coming soon" },
]

const NAV_ITEMS = [
  { label: "Grocery", href: "/grocery" },
  { label: "Laundry", href: "/laundry" },
  { label: "Services", href: "/home-services" },
  { label: "Travel", href: "/travel" },
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
  const [activeService, setActiveService] = useState(0)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [heroImages, setHeroImages] = useState<Record<string, string>>({})

  useEffect(() => setMounted(true), [])

  // Auto-slide hero service
  useEffect(() => {
    const t = setInterval(() => setActiveService(c => (c + 1) % SERVICES.length), 3500)
    return () => clearInterval(t)
  }, [])

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
      setBanners(data.length > 0 ? data.map((s: any) => ({ id: s.id, title: s.title || "", subtitle: s.description || s.subtitle || "", imageUrl: s.imageUrl || "", bgColor: s.bgColor || "#319F44", link: s.link || "/grocery" })) : [
        { id: "1", title: "Free Delivery", subtitle: "On orders ₱1,000+", imageUrl: "", bgColor: "#319F44", link: "/grocery" },
        { id: "2", title: "Laundry Pickup", subtitle: "We'll handle the rest", imageUrl: "", bgColor: "#1a56db", link: "/laundry" },
        { id: "3", title: "Home Services", subtitle: "Aircon, plumbing & more", imageUrl: "", bgColor: "#0d9488", link: "/home-services" },
      ])
      // Map hero images to service IDs by link
      const imgMap: Record<string, string> = {}
      const linkToService: Record<string, string> = { "/grocery": "grocery", "/laundry": "laundry", "/home-services": "services", "/travel": "travel" }
      data.forEach((s: any) => { if (s.imageUrl && s.link && linkToService[s.link]) imgMap[linkToService[s.link]] = s.imageUrl })
      setHeroImages(imgMap)
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

      {/* ── NAVBAR ── */}
      <header className="sticky top-0 z-50 shadow-sm" style={{ background: "var(--theme-color)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center shadow-sm">
              <span className="text-white font-black text-sm">G</span>
            </div>
            <span className="font-black text-xl text-white tracking-tight">Gruwcer</span>
          </a>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <a key={item.label} href={item.href} className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors">{item.label}</a>
            ))}
          </nav>

{/* Right actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddressModal(true)} className="hidden md:flex items-center gap-1.5 text-sm text-white/80 hover:text-white px-3 py-2 rounded-lg hover:bg-white/10 transition-colors">
              <svg className="w-4 h-4 text-white/80 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="max-w-[120px] truncate">{detecting ? "Detecting..." : address || "Set location"}</span>
            </button>

            <div className="relative">
              <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 rounded-xl hover:bg-white/10 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {mounted && unread > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{unread}</span>}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">Notifications</span>
                    {mounted && unread > 0 && user && <button onClick={markAllRead} className="text-xs text-teal-600 font-semibold">Mark all read</button>}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? <p className="p-6 text-sm text-gray-400 text-center">No notifications yet</p> : notifications.slice(0, 8).map(n => (
                      <div key={n.id} className={`px-4 py-3 border-b border-gray-50 ${!n.read ? "bg-teal-50" : ""}`}>
                        <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <a href="/account" className="hidden md:flex items-center gap-2 bg-white text-teal-700 text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:bg-gray-100">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {mounted && profile?.name ? profile.name.split(" ")[0] : "Account"}
            </a>

            {/* Mobile menu toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 rounded-xl hover:bg-white/10 transition-colors">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} /></svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/20 bg-teal-700 px-4 py-3 space-y-1">
            {NAV_ITEMS.map(item => (
              <a key={item.label} href={item.href} className="block px-3 py-2.5 text-sm font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors">{item.label}</a>
            ))}
            <div className="pt-2 border-t border-white/20 mt-2">
              <button onClick={() => { setShowAddressModal(true); setMobileMenuOpen(false) }} className="flex items-center gap-2 w-full px-3 py-2.5 text-sm text-white/80 hover:bg-white/10 rounded-xl">
                <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                {detecting ? "Detecting..." : address || "Set location"}
              </button>
              <a href="/account" className="flex items-center gap-2 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/10 rounded-xl">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                {mounted && profile?.name ? profile.name : "My Account"}
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ── HERO SECTION: Left text + Right full image ── */}
      <section className="relative min-h-[560px] md:min-h-[640px] flex items-center border-b border-gray-100 overflow-hidden">
        {/* Right background image — fills entire right half */}
        <div className="absolute inset-y-0 right-0 w-full md:w-1/2">
          {(() => {
            const svc = SERVICES[activeService]
            const bgImage = heroImages[svc.id]
            return bgImage ? (
              <>
                <img src={bgImage} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent md:from-transparent md:via-transparent md:to-transparent" />
              </>
            ) : (
              <div className={`w-full h-full bg-gradient-to-br ${svc.color} opacity-20`} />
            )
          })()}
        </div>
        {/* Left fade overlay */}
        <div className="hidden md:block absolute inset-y-0 left-1/2 w-32 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 w-full">
          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">

            {/* LEFT: Text content */}
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 text-xs font-bold px-3 py-1.5 rounded-full mb-5">
                <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-pulse" />
                Your everyday super app
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-900 leading-tight tracking-tight">
                Everything<br />
                <span className="text-teal-600">delivered</span><br />
                to your door.
              </h1>
              <p className="mt-5 text-gray-500 text-lg leading-relaxed max-w-md">
                Grocery, laundry, home services and more — all in one app. Fast, reliable, and always nearby.
              </p>

              {/* Location + CTA */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <button onClick={() => setShowAddressModal(true)} className="flex items-center gap-2 bg-white border-2 border-gray-200 hover:border-teal-600 rounded-xl px-4 py-3 text-sm text-gray-600 transition-colors flex-1 sm:flex-none sm:min-w-[200px]">
                  <svg className="w-4 h-4 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  <span className="truncate">{detecting ? "Detecting..." : address || "Set your location"}</span>
                </button>
                <a href="/grocery" className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-lg shadow-teal-600/20 text-sm">
                  Order Now
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                </a>
              </div>

              {/* Stats */}
              <div className="mt-10 flex items-center gap-8">
                {[["10K+", "Happy customers"], ["4.9★", "App rating"], ["30min", "Avg delivery"]].map(([val, label]) => (
                  <div key={label}>
                    <p className="text-xl font-black text-gray-900">{val}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: empty — image is the background */}
            <div className="hidden md:block" />
          </div>

          {/* Dot indicators */}
          <div className="flex gap-1.5 mt-8">
            {SERVICES.map((_, i) => (
              <button key={i} onClick={() => setActiveService(i)} className={`h-1.5 rounded-full transition-all duration-300 ${i === activeService ? "bg-teal-600 w-5" : "bg-gray-300 w-1.5"}`} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES GRID ── */}
      <section className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">Our Services</h2>
            <p className="text-gray-400 text-sm mt-1">Everything you need, delivered fast</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {SERVICES.map((s, i) => (
            <a key={s.id} href={s.available ? s.href : undefined}
              className={`relative group bg-white rounded-2xl border border-gray-100 p-4 md:p-5 flex flex-col items-center gap-3 shadow-sm transition-all ${s.available ? "hover:shadow-lg hover:-translate-y-1 hover:border-teal-600/30 cursor-pointer" : "opacity-50 cursor-default"}`}>
              {!s.available && <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 text-[9px] font-black px-2 py-0.5 rounded-full whitespace-nowrap">SOON</span>}
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-sm`}>{s.icon}</div>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-800">{s.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 leading-tight hidden md:block">{s.desc}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── BANNER CAROUSEL ── */}
      {mounted && banners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
          <div className="relative rounded-3xl overflow-hidden h-[180px] md:h-[300px] shadow-lg cursor-pointer"
            style={{
              backgroundColor: banners[currentBanner]?.bgColor || "#319F44",
              backgroundImage: banners[currentBanner]?.imageUrl ? `linear-gradient(105deg,rgba(0,0,0,0.65) 0%,rgba(0,0,0,0.1) 60%),url(${banners[currentBanner].imageUrl})` : undefined,
              backgroundSize: "cover", backgroundPosition: "center",
            }}>
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full" />
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/5 rounded-full" />
            <a href={banners[currentBanner]?.link || "#"} className="absolute inset-0 flex flex-col justify-center p-6 md:p-12">
              <span className="self-start bg-white/20 backdrop-blur border border-white/30 rounded-full px-3 py-1 text-white text-[10px] font-bold uppercase tracking-widest mb-3">✦ Featured</span>
              <h2 className="text-white font-black text-2xl md:text-5xl leading-tight drop-shadow max-w-lg">{banners[currentBanner]?.title}</h2>
              <p className="text-white/80 text-sm md:text-lg mt-2 max-w-sm">{banners[currentBanner]?.subtitle}</p>
              <span className="self-start mt-4 bg-white text-gray-900 text-xs md:text-sm font-bold px-5 py-2.5 rounded-xl shadow-lg hover:bg-gray-50 transition-colors">Order now →</span>
            </a>
            {banners.length > 1 && (
              <div className="absolute bottom-4 right-4 flex gap-1.5">
                {banners.map((_, i) => <button key={i} onClick={() => setCurrentBanner(i)} className={`h-1.5 rounded-full transition-all ${i === currentBanner ? "bg-white w-6" : "bg-white/40 w-1.5"}`} />)}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── PROMOS ── */}
      {mounted && promos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-black text-gray-900">Deals for you</h2>
            <span className="text-xs text-teal-600 font-semibold bg-teal-50 px-3 py-1 rounded-full">Limited time</span>
          </div>
          <div className="flex md:grid md:grid-cols-3 gap-3 overflow-x-auto md:overflow-visible scrollbar-hide pb-1">
            {promos.map((p) => (
              <div key={p.id} className="flex-shrink-0 min-w-[220px] md:min-w-0 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-400 rounded-xl flex items-center justify-center shrink-0 shadow-sm">
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
        </section>
      )}

      {/* ── PARTNERS ── */}
      {mounted && partners.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 md:px-8 pb-12">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl md:text-2xl font-black text-gray-900">Laundry Partners</h2>
            <a href="/laundry" className="text-xs text-teal-600 font-semibold hover:underline">See all</a>
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
        </section>
      )}

      {/* ── HOW IT WORKS ── */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-black text-gray-900">How it works</h2>
            <p className="text-gray-400 text-sm mt-2">Simple, fast, and reliable</p>
          </div>
          <div className="grid grid-cols-3 gap-4 md:gap-8">
            {[
              { step: "01", title: "Choose", desc: "Pick a service or browse products", emoji: "👆" },
              { step: "02", title: "Order", desc: "Add to cart and pay securely", emoji: "🛒" },
              { step: "03", title: "Enjoy", desc: "Delivered fast to your door", emoji: "🚀" },
            ].map((s) => (
              <div key={s.step} className="bg-white rounded-2xl p-5 md:p-8 border border-gray-100 shadow-sm text-center hover:shadow-md transition-all hover:-translate-y-0.5">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl md:text-3xl">{s.emoji}</div>
                <span className="text-[10px] font-black text-teal-600 tracking-widest">{s.step}</span>
                <p className="font-black text-sm md:text-lg text-gray-900 mt-1">{s.title}</p>
                <p className="text-[10px] md:text-sm text-gray-400 mt-1 leading-snug">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="max-w-7xl mx-auto px-4 md:px-8 py-10 md:py-12">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-sm">G</span>
            </div>
            <span className="font-black text-xl text-gray-900 tracking-tight">Gruwcer</span>
            <span className="text-gray-300 text-sm ml-1">— Your everyday super app</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {[["Grocery", "/grocery"], ["Laundry", "/laundry"], ["Services", "/home-services"], ["Account", "/account"], ["Sign In", "/auth"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm text-gray-400 hover:text-teal-600 transition-colors">{label}</a>
            ))}
          </div>
        </div>
        <div className="border-t border-gray-100 mt-8 pt-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-300">© {new Date().getFullYear()} Gruwcer. All rights reserved.</p>
          <p className="text-xs text-gray-300">Made with ❤️ in Cebu, Philippines</p>
        </div>
      </footer>

      {/* ── BOTTOM NAV (mobile) ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 safe-bottom" suppressHydrationWarning>
        <div className="grid grid-cols-4 py-2">
          <a href="/" className="flex flex-col items-center gap-0.5 py-1 text-teal-600">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[10px] font-bold">Home</span>
          </a>
          <a href="/grocery" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <span className="text-[10px]">Grocery</span>
          </a>
          <a href="/laundry" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
            <span className="text-[10px]">Laundry</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px]">Account</span>
          </a>
        </div>
      </nav>

      {/* ── ACTIVE ORDER TRACKER ── */}
      {mounted && activeOrders.length > 0 && (
        <>
          {!showOrderTracker && (
            <button onClick={() => setShowOrderTracker(true)} className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-white border border-gray-200 shadow-2xl rounded-full pl-14 pr-5 py-3 flex items-center gap-3 hover:shadow-xl transition-shadow">
              <div className="absolute left-2 top-1/2 -translate-y-1/2 flex">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 border-2 border-white flex items-center justify-center z-30 shadow-md text-lg">🛒</div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 border-2 border-white flex items-center justify-center -ml-2 z-20 shadow-md text-sm">👕</div>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">{activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}</p>
                <p className="text-xs text-gray-400">Tap to track</p>
              </div>
              <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center ml-1">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
              </div>
            </button>
          )}
          {showOrderTracker && (
            <div className="fixed bottom-20 md:bottom-8 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[60] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-teal-600 rounded-full animate-pulse" />
                  <span className="text-sm font-bold text-gray-900">{activeOrders.length} Active Order{activeOrders.length > 1 ? "s" : ""}</span>
                </div>
                <button onClick={() => setShowOrderTracker(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                {activeOrders.map((order) => {
                  const href = order.type === "grocery" ? `/order?id=${order.id}` : order.type === "laundry" ? "/laundry" : "/home-services"
                  const progressMap: Record<string, number> = { pending: 15, confirmed: 30, preparing: 45, ready_for_pickup: 60, rider_picked_up: 75, out_for_delivery: 85, washing: 65 }
                  const progress = progressMap[order.status] || 20
                  return (
                    <a key={`${order.type}-${order.id}`} href={href} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-lg shrink-0">
                        {order.type === "grocery" ? "🛒" : order.type === "laundry" ? "👕" : "🔧"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-800 truncate">{order.name}</p>
                          <p className="text-xs font-bold text-gray-600 ml-2">₱{order.total}</p>
                        </div>
                        <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 capitalize">{order.status.replace(/_/g, " ")}</p>
                      </div>
                      <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </a>
                  )
                })}
              </div>
              <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-100">
                <a href="/account" className="text-xs text-teal-600 font-bold text-center block">View all orders →</a>
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
              <button onClick={() => { detectLocation(); setShowAddressModal(false) }} className="w-full flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 hover:bg-teal-100 transition-colors">
                <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-teal-600">Use current location</p>
                  <p className="text-xs text-gray-400">Detect via GPS</p>
                </div>
              </button>
              {savedAddresses.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Saved</p>
                  <div className="space-y-2">
                    {savedAddresses.map((addr) => {
                      const icons: Record<string, string> = { Home: "🏠", Office: "🏢", Work: "💼", Other: "📍" }
                      const active = address === addr.address
                      return (
                        <div key={addr.id} onClick={() => selectAddress(addr)} className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-colors ${active ? "border-teal-600 bg-teal-50" : "border-gray-200 hover:border-gray-300"}`}>
                          <span className="text-xl shrink-0">{icons[addr.label] || "📍"}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800">{addr.label}</p>
                            <p className="text-xs text-gray-500 truncate">{addr.address}</p>
                          </div>
                          {active && <div className="w-2 h-2 bg-teal-600 rounded-full shrink-0" />}
                          <button onClick={(e) => { e.stopPropagation(); deleteAddress(addr.id) }} className="text-gray-300 hover:text-red-400 text-xl leading-none shrink-0">&times;</button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {!addingNew ? (
                <button onClick={() => setAddingNew(true)} className="w-full flex items-center gap-3 border-2 border-dashed border-gray-200 rounded-xl px-4 py-3 hover:border-teal-600 transition-colors">
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
                      const lblIcons: Record<string, string> = { Home: "🏠", Office: "🏢", Work: "💼", Other: "📍" }
                      return (
                        <button key={lbl} onClick={() => setNewAddr((p) => ({ ...p, label: lbl }))} className={`py-2 rounded-xl text-xs font-bold border transition-colors ${newAddr.label === lbl ? "bg-teal-600 text-white border-teal-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}>
                          <span className="block text-base mb-0.5">{lblIcons[lbl]}</span>{lbl}
                        </button>
                      )
                    })}
                  </div>
                  <textarea placeholder="Enter full address..." value={newAddr.address} onChange={(e) => setNewAddr((p) => ({ ...p, address: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-teal-600 resize-none" rows={2} />
                  <button onClick={detectForNew} disabled={locatingNew} className="w-full flex items-center justify-center gap-2 border border-dashed border-blue-200 bg-blue-50 text-blue-600 rounded-xl py-2 text-xs font-medium">
                    {locatingNew ? "Detecting..." : "📍 Use current location"}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => { setAddingNew(false); setNewAddr({ label: "Home", address: "", lat: 0, lng: 0 }) }} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-xs font-medium">Cancel</button>
                    <button onClick={saveNewAddress} disabled={savingAddr || !newAddr.address.trim()} className="flex-1 bg-teal-600 text-white py-2.5 rounded-xl text-xs font-bold disabled:opacity-40">{savingAddr ? "Saving..." : "Save Address"}</button>
                  </div>
                </div>
              )}
              {mounted && !user && <p className="text-xs text-center text-gray-400 pb-2"><a href="/auth" className="text-teal-600 font-bold">Sign in</a> to save addresses across devices</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── PWA INSTALL ── */}
      {mounted && showInstall && !isStandalone && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowInstall(false); sessionStorage.setItem("install-dismissed", "1") }} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 pt-8 pb-10 text-center relative overflow-hidden">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
              <div className="w-14 h-14 bg-white rounded-2xl shadow-xl flex items-center justify-center mx-auto mb-4">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center"><span className="text-white font-black text-sm">G</span></div>
              </div>
              <h2 className="text-white font-black text-xl">Install Gruwcer</h2>
              <p className="text-white/70 text-xs mt-1">Get the full app experience</p>
            </div>
            <div className="px-6 -mt-5 relative">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                {[{ emoji: "⚡", text: "Faster loading & instant access" }, { emoji: "🔔", text: "Order notifications & updates" }, { emoji: "🏠", text: "Launch from your home screen" }].map((b) => (
                  <div key={b.text} className="flex items-center gap-3">
                    <span className="text-xl shrink-0">{b.emoji}</span>
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
