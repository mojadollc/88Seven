"use client"

import { useEffect, useState, useLayoutEffect } from "react"
import { createPortal } from "react-dom"

const CATEGORY_ICONS: Record<string, string> = {
  "all": "🛒",
  "beverages": "🧃",
  "household": "🧹",
  "condiments": "🧂",
  "snacks": "🍿",
  "frozen": "🧊",
  "personal care": "🧴",
  "canned goods": "🥫",
  "medicine & health": "💊",
  "fruits & vegetables": "🥦",
  "dried foods": "🌾",
  "dairy & eggs": "🥚",
  "biscuits": "🍪",
  "bread & pastry": "🍞",
  "meat & seafood": "🥩",
  "rice": "🍚",
  "office & school supply": "📎",
  "baby": "🍼",
  "pet": "🐾",
  "others": "📦",
}

const CATEGORY_COLORS: Record<string, string> = {
  "all": "bg-[#59EBC6]/20 text-[#267a34]",
  "beverages": "bg-blue-100 text-blue-700",
  "household": "bg-yellow-100 text-yellow-700",
  "condiments": "bg-orange-100 text-orange-700",
  "snacks": "bg-pink-100 text-pink-700",
  "frozen": "bg-cyan-100 text-cyan-700",
  "personal care": "bg-purple-100 text-purple-700",
  "canned goods": "bg-red-100 text-red-700",
  "medicine & health": "bg-rose-100 text-rose-700",
  "fruits & vegetables": "bg-lime-100 text-lime-700",
  "dried foods": "bg-amber-100 text-amber-700",
  "dairy & eggs": "bg-yellow-100 text-yellow-700",
  "biscuits": "bg-orange-100 text-orange-700",
  "bread & pastry": "bg-amber-100 text-amber-700",
  "meat & seafood": "bg-red-100 text-red-700",
  "rice": "bg-[#59EBC6]/20 text-[#267a34]",
  "office & school supply": "bg-indigo-100 text-indigo-700",
  "baby": "bg-pink-100 text-pink-700",
  "pet": "bg-teal-100 text-teal-700",
  "others": "bg-gray-100 text-gray-600",
}

function getCatIcon(name: string) {
  return CATEGORY_ICONS[name.toLowerCase()] || CATEGORY_ICONS[Object.keys(CATEGORY_ICONS).find(k => name.toLowerCase().includes(k.split(" ")[0])) || ""] || "📦"
}
function getCatColor(name: string) {
  return CATEGORY_COLORS[name.toLowerCase()] || CATEGORY_COLORS[Object.keys(CATEGORY_COLORS).find(k => name.toLowerCase().includes(k.split(" ")[0])) || ""] || "bg-gray-100 text-gray-600"
}

export default function GroceryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState<any[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({ name: "", phone: "", address: "", landmark: "", notes: "", lat: 0, lng: 0, paymentMethod: "cod" })
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [deliverySettings, setDeliverySettings] = useState<any>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState<any>({ cod: true, wallet: true, qrph: true, ewallet: true, bank: true })
  const [addedProduct, setAddedProduct] = useState<any>(null)
  const [popupBanners, setPopupBanners] = useState<any[]>([])
  const [showPopup, setShowPopup] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [userAddress, setUserAddress] = useState("")
  const [detectingLocation, setDetectingLocation] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("user_location")
    if (saved) setUserAddress(JSON.parse(saved).address)
  }, [])

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    if (u) {
      setUser(u)
      const token = localStorage.getItem("token")
      fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(p => { if (p) { setProfile(p); setWalletBalance(p.walletBalance || 0) } })
    }
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("cart")
    if (saved) setCart(JSON.parse(saved))
    setCartLoaded(true)
  }, [])

  useEffect(() => {
    if (cartLoaded) localStorage.setItem("cart", JSON.stringify(cart))
  }, [cart, cartLoaded])

  useEffect(() => {
    fetch("/api/popup").then(r => r.json()).then((banners: any[]) => {
      const enabled = banners.filter(b => b.enabled && b.imageUrl)
      if (enabled.length > 0) { setPopupBanners([enabled[Math.floor(Math.random() * enabled.length)]]); setShowPopup(true) }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!user) return
    const poll = () => fetch(`/api/notifications?recipientType=customer&recipientId=${user.id}`).then(r => r.json()).then(setNotifications).catch(() => {})
    poll()
    const iv = setInterval(poll, 15000)
    return () => clearInterval(iv)
  }, [user])

  useEffect(() => {
    fetch("/api/delivery-settings").then(r => r.json()).then(setDeliverySettings).catch(() => {})
    fetch("/api/settings/payment-methods").then(r => r.ok ? r.json() : {}).then(pm => setPaymentMethods((prev: any) => ({ ...prev, ...pm }))).catch(() => {})
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/pos-products")
        const prods: any[] = await res.json()
        for (let i = prods.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[prods[i], prods[j]] = [prods[j], prods[i]] }
        setProducts(prods)
        const cats = [...new Set(prods.map((p: any) => p.category).filter(Boolean))] as string[]
        setCategories(cats)
      } catch (e) { console.error(e) } finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!deliverySettings) return
    const config = deliverySettings.grocery || { baseFare: 39, baseKm: 2, perKmRate: 10, surgeMultiplier: 1.5, surgeEnabled: false }
    const total = cart.reduce((sum, i) => sum + (i.product.onSale && i.product.salePrice ? i.product.salePrice : i.product.price) * i.quantity, 0)
    if (total >= (deliverySettings.freeDeliveryMinOrder || 1000)) { setDeliveryFee(0); return }
    if (checkoutForm.lat && checkoutForm.lng && deliverySettings.storeLat && deliverySettings.storeLng) {
      const R = 6371
      const dLat = (checkoutForm.lat - deliverySettings.storeLat) * Math.PI / 180
      const dLng = (checkoutForm.lng - deliverySettings.storeLng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(deliverySettings.storeLat * Math.PI / 180) * Math.cos(checkoutForm.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
      const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      let fee = config.baseFare + (Math.max(0, km - config.baseKm) * config.perKmRate)
      if (config.surgeEnabled) fee *= config.surgeMultiplier
      setDeliveryFee(Math.round(fee))
    } else { setDeliveryFee(config.baseFare) }
  }, [checkoutForm.lat, checkoutForm.lng, deliverySettings, cart])

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) { const newQty = existing.quantity + 1; setAddedProduct({ product, quantity: newQty }); return prev.map((i) => i.product.id === product.id ? { ...i, quantity: newQty } : i) }
      setAddedProduct({ product, quantity: 1 })
      return [...prev, { product, quantity: 1 }]
    })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  }

  const cartTotal = cart.reduce((sum, i) => sum + (i.product.onSale && i.product.salePrice ? i.product.salePrice : i.product.price) * i.quantity, 0)
  const cartDeposit = cart.reduce((sum, i) => sum + (i.product.bottleDeposit || 0) * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  const detectLocation = () => {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setCheckoutForm((prev) => ({ ...prev, lat: latitude, lng: longitude }))
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          const data = await res.json()
          setCheckoutForm((prev) => ({ ...prev, address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, lat: latitude, lng: longitude }))
        } catch { setCheckoutForm((prev) => ({ ...prev, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` })) }
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    )
  }

  const handleCheckout = async () => {
    if (!user) { window.location.href = "/auth?redirect=/grocery"; return }
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map((i: any) => ({ name: i.product.name, price: i.product.price, quantity: i.quantity, productId: i.product.id, imageUrl: i.product.imageUrl })), total: cartTotal + cartDeposit + deliveryFee, customerId: user?.id || null, customerName: checkoutForm.name, customerPhone: checkoutForm.phone, deliveryAddress: checkoutForm.address + (checkoutForm.landmark ? ` (Landmark: ${checkoutForm.landmark})` : ""), status: "pending", paymentMethod: checkoutForm.paymentMethod, deliveryType: new Date().getHours() < 15 ? "same_day" : "next_day", notes: checkoutForm.notes || "", deliveryLat: checkoutForm.lat || undefined, deliveryLng: checkoutForm.lng || undefined }) })
      const order = await res.json()
      const orderId = order.id
      await fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recipientType: "admin", title: "New Order!", message: `${checkoutForm.name} placed a new order`, orderId }) })
      setCart([]); setShowCheckout(false); setShowCart(false)
      if (checkoutForm.paymentMethod === "wallet") {
        await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: user.id, ownerType: "customer", type: "deduction", amount: -(cartTotal + cartDeposit + deliveryFee), orderId, note: `Grocery order #${orderId.slice(-6).toUpperCase()}` }) })
        setWalletBalance((prev: number) => prev - (cartTotal + cartDeposit + deliveryFee))
        window.location.href = `/order?id=${orderId}`; return
      }
      if (["qrph", "ewallet", "bank"].includes(checkoutForm.paymentMethod)) {
        const { createXenditPayment } = await import("@/lib/xendit")
        const pms = checkoutForm.paymentMethod === "qrph" ? ["QRPH"] : checkoutForm.paymentMethod === "ewallet" ? ["GRABPAY", "MAYA", "SHOPEEPAY"] : ["DD_BPI", "DD_UBP", "DD_RCBC"]
        const payment = await createXenditPayment({ amount: cartTotal + cartDeposit + deliveryFee, description: `Gruwcer Grocery #${orderId.slice(-6).toUpperCase()}`, externalId: `order_${orderId}`, paymentMethods: pms, successRedirectUrl: `${window.location.origin}/order?id=${orderId}`, failureRedirectUrl: `${window.location.origin}/payment/failed?id=${orderId}&service=grocery` })
        if (payment?.invoiceUrl) { window.location.href = payment.invoiceUrl; return }
      }
      window.location.href = `/order?id=${orderId}`
    } catch (e) { console.error(e); alert("Failed to place order. Please try again.") } finally { setSubmitting(false) }
  }

  useEffect(() => {
    if (profile && !checkoutForm.name) setCheckoutForm((prev) => ({ ...prev, name: profile.name || prev.name, phone: profile.phone || prev.phone, address: profile.address || prev.address }))
  }, [profile])

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === "All" || p.category === selectedCategory
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch && p.stock > 0
  })

  const allCategories = ["All", ...categories]

  return (
    <>
    <main className="min-h-screen bg-gray-50 pb-20">

      {/* ── HEADER ── */}
      <header className="bg-[#319F44] sticky top-0 z-50 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 md:px-6 py-2.5 flex items-center gap-3">
          <a href="/" className="flex items-center gap-1.5 shrink-0">
            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-xs">G</span>
            </div>
            <span className="text-white font-black text-base tracking-tight hidden sm:block">Gruwcer</span>
          </a>

          {/* Search */}
          <div className="flex-1 flex">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2 rounded-l-xl text-sm outline-none bg-white text-gray-800 placeholder-gray-400"
            />
            <button className="bg-[#FF8A00] px-4 rounded-r-xl">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </div>

          {/* Notif */}
          {user && (
            <div className="relative shrink-0">
              <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{notifications.filter(n => !n.read).length}</span>}
              </button>
              {showNotifications && (
                <div className="absolute right-0 top-10 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">Notifications</span>
                    {notifications.filter(n => !n.read).length > 0 && <button onClick={() => fetch("/api/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "markAllRead", recipientType: "customer", recipientId: user.id }) }).then(() => setNotifications(n => n.map(x => ({ ...x, read: true }))))} className="text-xs text-[#319F44] font-semibold">Mark all read</button>}
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {notifications.length === 0 ? <p className="p-4 text-xs text-gray-400 text-center">No notifications</p> : notifications.slice(0, 8).map(n => (
                      <div key={n.id} className={`px-4 py-2.5 border-b border-gray-50 ${!n.read ? "bg-[#319F44]/10" : ""}`}>
                        <p className="text-xs font-semibold text-gray-800">{n.title}</p>
                        <p className="text-[11px] text-gray-500">{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Cart */}
          <button onClick={() => setShowCart(true)} className="relative shrink-0 p-1.5">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            {cartCount > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-[#FF8A00] text-white text-[9px] font-bold rounded-full flex items-center justify-center">{cartCount}</span>}
          </button>

          {/* Account */}
          <a href="/account" className="shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </a>
        </div>

        {/* Delivery banner */}
        {(() => {
          const isSameDay = new Date().getHours() < 15
          return (
            <div className={`${isSameDay ? "bg-emerald-600" : "bg-blue-600"} py-1 text-center`}>
              <p className="text-white text-[11px] font-medium">
                {isSameDay ? "⚡ Same-Day Delivery — Order before 3:00 PM" : "🌙 Next-Day Delivery — Orders after 3PM delivered tomorrow"}
              </p>
            </div>
          )
        })()}
      </header>

      <div className="max-w-6xl mx-auto px-3 md:px-6">

        {/* ── HERO SLIDER ── */}
        <div className="mt-3">
          <HeroSlider />
        </div>

        {/* ── CATEGORIES (Shopee-style horizontal scroll) ── */}
        <div className="mt-3 bg-white rounded-2xl shadow-sm border border-gray-100 px-3 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {allCategories.map((cat) => {
              const isActive = selectedCategory === cat
              const icon = cat === "All" ? "🛒" : getCatIcon(cat)
              const colorClass = isActive ? "bg-[#319F44] text-white border-[#319F44]" : `${getCatColor(cat)} border-transparent`
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex flex-col items-center gap-1 shrink-0 px-3 py-2 rounded-xl border-2 transition-all ${colorClass} min-w-[64px]`}
                >
                  <span className="text-xl leading-none">{icon}</span>
                  <span className="text-[10px] font-semibold text-center leading-tight whitespace-nowrap">{cat === "All" ? "All" : cat.length > 10 ? cat.slice(0, 9) + "…" : cat}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── PRODUCTS ── */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-sm text-gray-800">
              {selectedCategory === "All" ? "All Products" : selectedCategory}
              {!loading && <span className="text-gray-400 font-normal ml-1.5">({filtered.length})</span>}
            </h2>
            {selectedCategory !== "All" && (
              <button onClick={() => setSelectedCategory("All")} className="text-xs text-[#319F44] font-semibold">Clear filter</button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse">
                  <div className="aspect-square bg-gray-100" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                    <div className="h-4 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-gray-500 font-medium">No products found</p>
              <button onClick={() => { setSelectedCategory("All"); setSearchQuery("") }} className="mt-3 text-sm text-[#319F44] font-semibold">Clear filters</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} onAdd={addToCart} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t border-gray-200 pb-4">
          <div className="flex items-center justify-between">
            <a href="/" className="font-black text-gray-800 tracking-tight">Gruwcer</a>
            <p className="text-xs text-gray-400">© {new Date().getFullYear()} Gruwcer. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* ── FLOATING CART BUTTON (mobile) ── */}
      {cartCount > 0 && !showCart && (
        <button onClick={() => setShowCart(true)} className="md:hidden fixed bottom-20 right-4 z-40 bg-[#FF8A00] text-white rounded-full shadow-xl px-5 py-3 flex items-center gap-2 font-bold text-sm">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
          {cartCount} item{cartCount > 1 ? "s" : ""} · ₱{cartTotal.toFixed(0)}
        </button>
      )}

      {/* ── ADDED TO CART MODAL ── */}
      {addedProduct && (
        <AddedToCartModal product={addedProduct.product} quantity={addedProduct.quantity} onClose={() => setAddedProduct(null)} onUpdateQuantity={updateQuantity} cartCount={cartCount} onViewCart={() => { setAddedProduct(null); setShowCart(true) }} />
      )}

      {/* ── CART DRAWER ── */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between shrink-0">
              <h2 className="font-bold text-lg text-gray-900">Cart <span className="text-gray-400 font-normal text-base">({cartCount})</span></h2>
              <div className="flex items-center gap-3">
                {cart.length > 0 && <button onClick={() => { if (confirm("Clear cart?")) setCart([]) }} className="text-xs text-red-400 font-medium">Clear</button>}
                <button onClick={() => setShowCart(false)} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">&times;</button>
              </div>
            </div>
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-gray-400">
                <span className="text-5xl">🛒</span>
                <p className="text-sm font-medium">Your cart is empty</p>
                <button onClick={() => setShowCart(false)} className="text-sm text-[#319F44] font-semibold">Continue shopping</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                      <div className="w-12 h-12 bg-white rounded-lg flex-shrink-0 flex items-center justify-center border border-gray-100">
                        {item.product.imageUrl ? <img src={item.product.imageUrl} className="w-10 h-10 object-contain" alt={item.product.name} /> : <span className="text-xl">📦</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.product.name}</p>
                        <p className="text-[#319F44] font-bold text-sm">₱{((item.product.onSale && item.product.salePrice ? item.product.salePrice : item.product.price) * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded-lg bg-white border border-gray-200 text-gray-600 font-bold text-sm flex items-center justify-center">−</button>
                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded-lg bg-[#319F44] text-white font-bold text-sm flex items-center justify-center">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t p-4 space-y-3 shrink-0 bg-white">
                  <div className="flex justify-between text-sm text-gray-600"><span>Subtotal</span><span>₱{cartTotal.toFixed(2)}</span></div>
                  {cartDeposit > 0 && <div className="flex justify-between text-sm text-orange-600"><span>Bottle Deposit</span><span>₱{cartDeposit.toFixed(2)}</span></div>}
                  <div className="flex justify-between font-bold text-gray-900 text-base border-t pt-2"><span>Total</span><span className="text-[#319F44]">₱{(cartTotal + cartDeposit).toFixed(2)}</span></div>
                  <button onClick={() => { setShowCart(false); if (!user) { window.location.href = "/auth?redirect=/grocery" } else { setShowCheckout(true); if (!checkoutForm.lat) detectLocation() } }} className="w-full bg-[#FF8A00] text-white py-3.5 rounded-xl font-bold hover:bg-[#e07800] transition-colors">Checkout →</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CHECKOUT MODAL ── */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-white rounded-t-3xl md:rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="bg-[#319F44] px-5 py-4 flex items-center justify-between">
              <div><h2 className="font-bold text-lg text-white">Checkout</h2><p className="text-white/70 text-xs">Complete your delivery details</p></div>
              <button onClick={() => setShowCheckout(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white">&times;</button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-3">
                <input placeholder="Full Name" value={checkoutForm.name} onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#319F44] outline-none" />
                <input type="tel" inputMode="numeric" placeholder="Phone Number" value={checkoutForm.phone} onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#319F44] outline-none" />
                <textarea placeholder="Delivery address..." value={checkoutForm.address} onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#319F44] outline-none resize-none" rows={2} />
                <button onClick={detectLocation} disabled={locating} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 bg-blue-50 text-blue-600 rounded-xl py-2.5 text-sm font-medium">
                  {locating ? "Detecting..." : "📍 Use current location"}
                </button>
                {checkoutForm.lat !== 0 && <p className="text-xs text-[#319F44]">✓ Location pinned</p>}
                <input placeholder="Landmark (required)" value={checkoutForm.landmark} onChange={(e) => setCheckoutForm({ ...checkoutForm, landmark: e.target.value })} className={`w-full border rounded-xl px-4 py-3 text-sm focus:border-[#319F44] outline-none ${!checkoutForm.landmark.trim() ? "border-amber-300 bg-amber-50/30" : "border-gray-200"}`} />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Payment</p>
                {paymentMethods.cod && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer ${checkoutForm.paymentMethod === "cod" ? "border-[#319F44] bg-[#319F44]/10" : "border-gray-200"}`}>
                    <input type="radio" name="pay" value="cod" checked={checkoutForm.paymentMethod === "cod"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "cod" })} className="accent-[#319F44]" />
                    <span className="text-xl">💵</span>
                    <div><p className="text-sm font-bold text-gray-800">Cash on Delivery</p><p className="text-xs text-gray-400">Pay when order arrives</p></div>
                  </label>
                )}
                {user && paymentMethods.wallet && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer ${checkoutForm.paymentMethod === "wallet" ? "border-purple-500 bg-purple-50" : "border-gray-200"}`}>
                    <input type="radio" name="pay" value="wallet" checked={checkoutForm.paymentMethod === "wallet"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "wallet" })} className="accent-purple-500" disabled={walletBalance < (cartTotal + cartDeposit + deliveryFee)} />
                    <span className="text-xl">👛</span>
                    <div className="flex-1"><p className="text-sm font-bold text-gray-800">Gruwcer Wallet</p><p className="text-xs text-gray-400">Balance: <span className="font-bold text-[#319F44]">₱{walletBalance.toFixed(2)}</span></p></div>
                    {walletBalance < (cartTotal + cartDeposit + deliveryFee) && <span className="text-[9px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">LOW</span>}
                  </label>
                )}
                {paymentMethods.qrph && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer ${checkoutForm.paymentMethod === "qrph" ? "border-blue-600 bg-blue-50" : "border-gray-200"}`}>
                    <input type="radio" name="pay" value="qrph" checked={checkoutForm.paymentMethod === "qrph"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "qrph" })} className="accent-blue-600" />
                    <span className="text-xl">📱</span>
                    <div className="flex-1"><p className="text-sm font-bold text-gray-800">QR Ph</p><p className="text-xs text-gray-400">Any PH banking app</p></div>
                    <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">INSTAPAY</span>
                  </label>
                )}
                {paymentMethods.ewallet && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer ${checkoutForm.paymentMethod === "ewallet" ? "border-sky-500 bg-sky-50" : "border-gray-200"}`}>
                    <input type="radio" name="pay" value="ewallet" checked={checkoutForm.paymentMethod === "ewallet"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "ewallet" })} className="accent-sky-500" />
                    <span className="text-xl">💳</span>
                    <div><p className="text-sm font-bold text-gray-800">E-Wallet</p><p className="text-xs text-gray-400">GrabPay · Maya · ShopeePay</p></div>
                  </label>
                )}
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-600"><span>Items ({cartCount})</span><span>₱{cartTotal.toFixed(2)}</span></div>
                {cartDeposit > 0 && <div className="flex justify-between text-sm text-orange-600"><span>Bottle Deposit</span><span>₱{cartDeposit.toFixed(2)}</span></div>}
                <div className="flex justify-between text-sm"><span className={deliveryFee === 0 ? "text-[#319F44]" : "text-gray-600"}>Delivery</span><span className={deliveryFee === 0 ? "text-[#319F44] font-bold" : ""}>{deliveryFee === 0 ? "FREE" : `₱${deliveryFee.toFixed(2)}`}</span></div>
                <div className="flex justify-between font-bold text-gray-900 border-t pt-2"><span>Total</span><span className="text-[#319F44] text-lg">₱{(cartTotal + cartDeposit + deliveryFee).toFixed(2)}</span></div>
              </div>
            </div>
            <div className="px-5 py-4 border-t bg-gray-50 shrink-0">
              <button onClick={handleCheckout} disabled={submitting || !checkoutForm.name || !checkoutForm.phone || !checkoutForm.address || !checkoutForm.landmark.trim()} className="w-full bg-[#FF8A00] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#e07800] transition-colors disabled:opacity-40 flex items-center justify-center gap-2">
                {submitting ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg> Placing...</> : `🛒 Place Order · ₱${(cartTotal + cartDeposit + deliveryFee).toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="max-w-lg mx-auto grid grid-cols-4 py-2">
          <a href="/" className="flex flex-col items-center gap-0.5 py-1 text-gray-400"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg><span className="text-[10px]">Home</span></a>
          <a href="/grocery" className="flex flex-col items-center gap-0.5 py-1 text-[#319F44]"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg><span className="text-[10px] font-bold">Grocery</span></a>
          <a href="/laundry" className="flex flex-col items-center gap-0.5 py-1 text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg><span className="text-[10px]">Laundry</span></a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-gray-400"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg><span className="text-[10px]">Account</span></a>
        </div>
      </nav>

      {showPopup && popupBanners.length > 0 && popupBanners[0].imageUrl && (
        <PopupModal banner={popupBanners[0]} onClose={() => setShowPopup(false)} />
      )}
    </main>
    </>
  )
}

function ProductCard({ product, onAdd }: any) {
  const hasDiscount = product.onSale && product.salePrice
  const displayPrice = hasDiscount ? product.salePrice : product.price
  const discount = hasDiscount ? Math.round(((product.price - product.salePrice) / product.price) * 100) : 0
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group">
      <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden p-2">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
        ) : (
          <span className="text-4xl">📦</span>
        )}
        {hasDiscount && <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-lg">-{discount}%</span>}
        {product.stock <= 5 && <span className="absolute bottom-2 left-2 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-md">Few left</span>}
      </div>
      <div className="p-2.5">
        <p className="text-xs text-gray-700 line-clamp-2 leading-snug min-h-[32px]">{product.name}</p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-[#319F44] font-black text-sm">₱{displayPrice.toFixed(2)}</span>
          {hasDiscount && <span className="text-gray-300 text-[10px] line-through">₱{product.price.toFixed(2)}</span>}
        </div>
        {product.bottleDeposit ? <p className="text-[10px] text-orange-500 mt-0.5">+₱{product.bottleDeposit} deposit</p> : null}
        <button onClick={() => onAdd(product)} className="w-full mt-2 bg-[#FF8A00] hover:bg-[#e07800] text-white text-xs font-bold py-2 rounded-xl transition-colors">Add to Cart</button>
      </div>
    </div>
  )
}

function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [slides, setSlides] = useState<any[]>([])
  const [loaded, setLoaded] = useState(false)
  const fallback = [
    { id: "1", badge: "Express Delivery", title: "Fast Delivery", highlight: "To Your Doorstep", description: "Fresh groceries delivered same day!", imageUrl: "", bgColor: "#319F44", link: "/grocery" },
    { id: "2", badge: "New Arrivals", title: "Fresh Products", highlight: "Every Single Day", description: "Quality essentials sourced daily.", imageUrl: "", bgColor: "#1F2937", link: "/grocery" },
    { id: "3", badge: "Member Exclusive", title: "Save Up To", highlight: "50% Off Today", description: "Sign up and unlock exclusive deals!", imageUrl: "", bgColor: "#FF8A00", link: "/auth" },
  ]
  useEffect(() => {
    fetch("/api/hero").then(r => r.json()).then(d => setSlides(d.length > 0 ? d : fallback)).catch(() => setSlides(fallback)).finally(() => setLoaded(true))
  }, [])
  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), 4000)
    return () => clearInterval(t)
  }, [slides.length])
  if (!loaded) return <div className="h-[160px] md:h-[260px] bg-gray-200 rounded-2xl animate-pulse" />
  const slide = slides[current]
  return (
    <div className="relative rounded-2xl overflow-hidden h-[160px] md:h-[260px] shadow-sm"
      style={{ backgroundColor: slide.bgColor, backgroundImage: slide.imageUrl ? `linear-gradient(105deg,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.1) 60%),url(${slide.imageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}>
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full" />
      <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-white/5 rounded-full" />
      <a href={slide.link || "#"} className="absolute inset-0 flex flex-col justify-center p-5 md:p-10">
        {slide.badge && <span className="self-start bg-white/20 backdrop-blur border border-white/30 rounded-full px-3 py-1 text-white text-[10px] font-bold uppercase tracking-widest mb-2">✦ {slide.badge}</span>}
        <h2 className="text-white font-black text-xl md:text-4xl leading-tight drop-shadow">{slide.title}<br /><span className="text-yellow-300">{slide.highlight}</span></h2>
        <p className="text-white/80 text-xs md:text-sm mt-1.5 max-w-xs">{slide.description}</p>
        <span className="self-start mt-3 bg-white text-gray-900 text-xs font-bold px-4 py-2 rounded-xl shadow hover:bg-gray-50 transition-colors">Shop Now →</span>
      </a>
      {slides.length > 1 && (
        <div className="absolute bottom-3 right-4 flex gap-1.5">
          {slides.map((_: any, i: number) => <button key={i} onClick={() => setCurrent(i)} className={`h-1.5 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/40 w-1.5"}`} />)}
        </div>
      )}
    </div>
  )
}

function AddedToCartModal({ product, quantity, onClose, onUpdateQuantity, cartCount, onViewCart }: any) {
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 999999, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)" }} onClick={onClose} />
      <div style={{ position: "relative", background: "#fff", borderRadius: "16px", width: "100%", maxWidth: "22rem", padding: "1.5rem", textAlign: "center" }}>
        <div style={{ width: "56px", height: "56px", background: "#dcfce7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <svg style={{ width: "32px", height: "32px", color: "#319F44" }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h3 style={{ fontWeight: "bold", fontSize: "1rem", marginBottom: "0.75rem" }}>Added to Cart!</h3>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", background: "#f9fafb", borderRadius: "12px", padding: "0.75rem" }}>
          <div style={{ width: "48px", height: "48px", background: "#fff", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #e5e7eb", flexShrink: 0 }}>
            {product.imageUrl ? <img src={product.imageUrl} style={{ width: "40px", height: "40px", objectFit: "contain" }} alt={product.name} /> : <span style={{ fontSize: "1.5rem" }}>📦</span>}
          </div>
          <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
            <p style={{ fontSize: "0.8rem", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.name}</p>
            <p style={{ color: "#319F44", fontWeight: "bold", fontSize: "0.875rem" }}>₱{((product.onSale && product.salePrice ? product.salePrice : product.price) * quantity).toFixed(2)}</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "1rem", marginTop: "1rem" }}>
          <button onClick={() => { if (quantity <= 1) { onUpdateQuantity(product.id, -1); onClose() } else { onUpdateQuantity(product.id, -1) } }} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#f3f4f6", border: "none", fontSize: "1.25rem", cursor: "pointer" }}>−</button>
          <span style={{ fontSize: "1.125rem", fontWeight: "bold", width: "32px", textAlign: "center" }}>{quantity}</span>
          <button onClick={() => onUpdateQuantity(product.id, 1)} style={{ width: "36px", height: "36px", borderRadius: "50%", background: "#319F44", color: "#fff", border: "none", fontSize: "1.25rem", cursor: "pointer" }}>+</button>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button onClick={onClose} style={{ flex: 1, border: "1px solid #e5e7eb", background: "#fff", padding: "0.625rem", borderRadius: "10px", fontSize: "0.8rem", cursor: "pointer" }}>Continue</button>
          <button onClick={onViewCart} style={{ flex: 1, background: "#FF8A00", color: "#fff", padding: "0.625rem", borderRadius: "10px", fontSize: "0.8rem", fontWeight: "bold", border: "none", cursor: "pointer" }}>View Cart ({cartCount})</button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function PopupModal({ banner, onClose }: { banner: any; onClose: () => void }) {
  useLayoutEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = "" } }, [])
  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 2147483647, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)" }} onClick={onClose}>
      <div style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: "absolute", top: "-44px", left: "50%", transform: "translateX(-50%)", width: "36px", height: "36px", background: "transparent", border: "2px solid #fff", borderRadius: "50%", color: "#fff", fontSize: "18px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>✕</button>
        {banner.linkUrl ? <a href={banner.linkUrl} onClick={onClose}><img src={banner.imageUrl} alt="Promo" style={{ maxWidth: "min(380px, 90vw)", maxHeight: "75vh", display: "block" }} /></a> : <img src={banner.imageUrl} alt="Promo" style={{ maxWidth: "min(380px, 90vw)", maxHeight: "75vh", display: "block" }} />}
      </div>
    </div>,
    document.body
  )
}
