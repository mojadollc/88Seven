"use client"

import { useEffect, useState } from "react"
import { getProducts, getCategories, getHeroSlides, createOrder, getDeliverySettings, customerLogout, getCustomerProfile, onCustomerAuthChange, setupRecaptcha, sendOTP, verifyOTP, ensureCustomerProfile, notifyOrderPlaced, onNotifications, markAllNotificationsRead, getPopupBanner, getCustomerWalletBalance, deductCustomerWallet, getPaymentMethodsConfig, type Product, type HeroSlide, type CartItem, type OrderItem, type DeliverySettings, type CustomerProfile, type AppNotification, type PopupBanner, type PaymentMethodsConfig } from "@/lib/firebase"
import type { User, ConfirmationResult } from "firebase/auth"

export default function Home() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("All")
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartLoaded, setCartLoaded] = useState(false)

  // Location
  const [userAddress, setUserAddress] = useState("")
  const [userLat, setUserLat] = useState(0)
  const [userLng, setUserLng] = useState(0)
  const [detectingLocation, setDetectingLocation] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("user_location")
    if (saved) {
      const loc = JSON.parse(saved)
      setUserAddress(loc.address)
      setUserLat(loc.lat)
      setUserLng(loc.lng)
    } else {
      fetchUserLocation()
    }
  }, [])

  const fetchUserLocation = () => {
    if (!navigator.geolocation) return
    setDetectingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setUserLat(latitude)
        setUserLng(longitude)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`)
          const data = await res.json()
          const addr = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setUserAddress(addr)
          localStorage.setItem("user_location", JSON.stringify({ address: addr, lat: latitude, lng: longitude }))
        } catch {
          const addr = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
          setUserAddress(addr)
          localStorage.setItem("user_location", JSON.stringify({ address: addr, lat: latitude, lng: longitude }))
        } finally { setDetectingLocation(false) }
      },
      () => setDetectingLocation(false),
      { enableHighAccuracy: true }
    )
  }

  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null)
  const [authError, setAuthError] = useState("")
  const [authLoading, setAuthLoading] = useState(false)

  useEffect(() => {
    const unsub = onCustomerAuthChange(async (u) => {
      setUser(u)
      if (u) {
        const p = await getCustomerProfile(u.uid)
        setProfile(p)
        getCustomerWalletBalance(u.uid).then(setWalletBalance)
      } else {
        setProfile(null)
        setWalletBalance(0)
      }
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem("cart")
    if (saved) setCart(JSON.parse(saved))
    setCartLoaded(true)
  }, [])

  useEffect(() => {
    if (cartLoaded) localStorage.setItem("cart", JSON.stringify(cart))
  }, [cart, cartLoaded])
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [checkoutForm, setCheckoutForm] = useState({ name: "", phone: "", address: "", landmark: "", notes: "", lat: 0, lng: 0, paymentMethod: "cod" })
  const [submitting, setSubmitting] = useState(false)
  const [locating, setLocating] = useState(false)
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null)
  const [deliveryFee, setDeliveryFee] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsConfig>({ cod: true, wallet: true, qrph: true, ewallet: true, bank: true, xendit: true })
  const [addedProduct, setAddedProduct] = useState<{ product: Product; quantity: number } | null>(null)
  const [popupBanner, setPopupBanner] = useState<PopupBanner | null>(null)
  const [showPopup, setShowPopup] = useState(false)

  // Load popup banner on every page load
  useEffect(() => {
    getPopupBanner().then((banner) => {
      if (banner) { setPopupBanner(banner); setShowPopup(true) }
    })
  }, [])
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)

  // Listen for customer notifications
  useEffect(() => {
    if (!user) { setNotifications([]); return }
    const unsub = onNotifications("customer", user.uid, setNotifications)
    return () => unsub()
  }, [user])

  useEffect(() => {
    getDeliverySettings().then(setDeliverySettings)
    getPaymentMethodsConfig().then(setPaymentMethods)
  }, [])


  const addToCart = (product: Product) => {
    let newQty = 1
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) {
        newQty = existing.quantity + 1
        return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { product, quantity: 1 }]
    })
    setAddedProduct({ product, quantity: newQty })
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, quantity: Math.max(0, i.quantity + delta) } : i).filter((i) => i.quantity > 0))
  }

  const cartTotal = cart.reduce((sum, i) => sum + (i.product.onSale && i.product.salePrice ? i.product.salePrice : i.product.price) * i.quantity, 0)
  const cartDeposit = cart.reduce((sum, i) => sum + (i.product.bottleDeposit || 0) * i.quantity, 0)
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0)

  // Calculate delivery fee when location/cart changes
  useEffect(() => {
    if (!deliverySettings) return
    const config = deliverySettings.grocery || { baseFare: 39, baseKm: 2, perKmRate: 10, surgeMultiplier: 1.5, surgeEnabled: false }
    const total = cart.reduce((sum, i) => sum + (i.product.onSale && i.product.salePrice ? i.product.salePrice : i.product.price) * i.quantity, 0)
    if (total >= (deliverySettings.freeDeliveryMinOrder || 1000)) {
      setDeliveryFee(0)
      return
    }
    if (checkoutForm.lat && checkoutForm.lng && deliverySettings.storeLat && deliverySettings.storeLng) {
      const R = 6371
      const dLat = (checkoutForm.lat - deliverySettings.storeLat) * Math.PI / 180
      const dLng = (checkoutForm.lng - deliverySettings.storeLng) * Math.PI / 180
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(deliverySettings.storeLat * Math.PI / 180) * Math.cos(checkoutForm.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2
      const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      const extraKm = Math.max(0, km - config.baseKm)
      let fee = config.baseFare + (extraKm * config.perKmRate)
      if (config.surgeEnabled) fee *= config.surgeMultiplier
      setDeliveryFee(Math.round(fee))
    } else {
      setDeliveryFee(config.baseFare)
    }
  }, [checkoutForm.lat, checkoutForm.lng, deliverySettings, cart])

  const detectLocation = () => {
    if (!navigator.geolocation) { alert("Geolocation is not supported by your browser"); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setCheckoutForm((prev) => ({ ...prev, lat: latitude, lng: longitude }))
        try {
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
          let address = ""
          if (apiKey && apiKey !== "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`)
            const data = await res.json()
            if (data.results?.[0]) address = data.results[0].formatted_address
          }
          if (!address) {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`)
            const data = await res.json()
            address = data.display_name || ""
          }
          setCheckoutForm((prev) => ({ ...prev, address: address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, lat: latitude, lng: longitude }))
        } catch {
          setCheckoutForm((prev) => ({ ...prev, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, lat: latitude, lng: longitude }))
        } finally {
          setLocating(false)
        }
      },
      () => { alert("Unable to get your location. Please allow location access."); setLocating(false) },
      { enableHighAccuracy: true }
    )
  }

  const handleCheckout = async () => {
    if (!user) { window.location.href = "/auth?redirect=/grocery"; return }
    if (!checkoutForm.name || !checkoutForm.phone || !checkoutForm.address) return
    setSubmitting(true)
    try {
      const items: OrderItem[] = cart.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        price: i.product.onSale && i.product.salePrice ? i.product.salePrice : i.product.price,
        quantity: i.quantity,
        imageUrl: i.product.imageUrl || "",
      }))
      const orderData: Record<string, any> = {
        items,
        total: cartTotal + cartDeposit + deliveryFee,
        customerId: user.uid,
        customerName: checkoutForm.name,
        customerPhone: checkoutForm.phone,
        deliveryAddress: checkoutForm.address + (checkoutForm.landmark ? ` (Landmark: ${checkoutForm.landmark})` : ""),
        status: "pending",
        paymentMethod: checkoutForm.paymentMethod,
        deliveryType: new Date().getHours() < 15 ? "same_day" : "next_day",
        notes: checkoutForm.notes || "",
      }
      if (checkoutForm.lat) orderData.deliveryLat = checkoutForm.lat
      if (checkoutForm.lng) orderData.deliveryLng = checkoutForm.lng
      const orderId = await createOrder(orderData as any)
      await notifyOrderPlaced(orderId, checkoutForm.name)
      setCart([])
      setShowCheckout(false)
      setShowCart(false)

      // Payroo Wallet payment
      if (checkoutForm.paymentMethod === "wallet") {
        const total = cartTotal + cartDeposit + deliveryFee
        await deductCustomerWallet(user.uid, total, orderId, `Grocery order #${orderId.slice(-6).toUpperCase()}`)
        setWalletBalance((prev) => prev - total)
        window.location.href = `/order?id=${orderId}`
        return
      }

      // If online payment, create Xendit invoice and redirect
      if (["qrph", "ewallet", "bank"].includes(checkoutForm.paymentMethod)) {
        const { createXenditPayment } = await import("@/lib/xendit")
        const total = cartTotal + cartDeposit + deliveryFee
      const paymentMethods =
          checkoutForm.paymentMethod === "qrph" ? ["QRPH"] :
          checkoutForm.paymentMethod === "ewallet" ? ["GRABPAY", "MAYA", "SHOPEEPAY"] :
          checkoutForm.paymentMethod === "bank" ? ["DD_BPI", "DD_UBP", "DD_RCBC"] :
          ["GRABPAY", "MAYA", "SHOPEEPAY", "QRPH", "DD_BPI", "DD_UBP", "DD_RCBC", "BILLEASE", "CEBUANA", "LBC"]
        const payment = await createXenditPayment({
          amount: total,
          description: `88 Seven Grocery #${orderId.slice(-6).toUpperCase()}`,
          externalId: `order_${orderId}`,
          paymentMethods,
          successRedirectUrl: `${window.location.origin}/order?id=${orderId}`,
          failureRedirectUrl: `${window.location.origin}/payment/failed?id=${orderId}&service=grocery`,
        })
        if (payment?.invoiceUrl) {
          window.location.href = payment.invoiceUrl
          return
        }
      }
      window.location.href = `/order?id=${orderId}`
    } catch (e) {
      console.error("Order error:", e)
      alert("Failed to place order. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleSendOTP = async () => {
    setAuthError("")
    if (!phoneNumber || phoneNumber.length < 10) { setAuthError("Enter a valid phone number"); return }
    setAuthLoading(true)
    try {
      const fullNumber = `+63${phoneNumber.replace(/^0/, "")}`
      const verifier = setupRecaptcha("recaptcha-container")
      const result = await sendOTP(fullNumber, verifier)
      setConfirmResult(result)
      setOtpSent(true)
    } catch (e: any) {
      setAuthError(e.message?.replace("Firebase: ", "") || "Failed to send OTP")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setAuthError("")
    if (!otpCode || otpCode.length < 6) { setAuthError("Enter the 6-digit code"); return }
    setAuthLoading(true)
    try {
      const u = await verifyOTP(confirmResult!, otpCode)
      await ensureCustomerProfile(u)
      setShowAuth(false)
      setPhoneNumber("")
      setOtpCode("")
      setOtpSent(false)
      setConfirmResult(null)
      if (cart.length > 0) { setShowCheckout(true); if (!checkoutForm.lat) detectLocation() }
    } catch (e: any) {
      setAuthError(e.message?.replace("Firebase: ", "") || "Invalid OTP code")
    } finally {
      setAuthLoading(false)
    }
  }

  const handleLogout = async () => {
    await customerLogout()
    setProfile(null)
  }

  // Pre-fill checkout form from profile
  useEffect(() => {
    if (profile && !checkoutForm.name) {
      setCheckoutForm((prev) => ({ ...prev, name: profile.name || prev.name, phone: profile.phone || prev.phone, address: profile.address || prev.address }))
    }
  }, [profile])

  useEffect(() => {
    async function load() {
      try {
        const [prods, cats] = await Promise.all([getProducts(), getCategories()])
        // Shuffle products randomly on each page load
        for (let i = prods.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [prods[i], prods[j]] = [prods[j], prods[i]]
        }
        setProducts(prods)
        setCategories(cats)
      } catch (e) {
        console.error("Failed to load products:", e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = products.filter((p) => {
    const matchCat = selectedCategory === "All" || p.category === selectedCategory
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchCat && matchSearch && p.stock > 0
  })

  const categoryList = [
    { label: "Beverages", emoji: "🧃" },
    { label: "Household", emoji: "🧹" },
    { label: "Condiments", emoji: "🧂" },
    { label: "Snacks", emoji: "🍪" },
    { label: "Frozen", emoji: "🧊" },
    { label: "Personal Care", emoji: "🧴" },
    { label: "Canned Goods", emoji: "🥫" },
    { label: "Medicine & Health", emoji: "💊" },
    { label: "Fruits & Vegetables", emoji: "🥦" },
    { label: "Dried Foods", emoji: "🌾" },
    { label: "Dairy & Eggs", emoji: "🥚" },
    { label: "Biscuits", emoji: "🍘" },
    { label: "Bread & Pastry", emoji: "🍞" },
    { label: "Meat & Seafood", emoji: "🥩" },
    { label: "Rice", emoji: "🍚" },
    { label: "Others", emoji: "🛒" },
  ]

  return (
    <main className="min-h-screen bg-[#f5f5f5] pb-20">
      {/* ═══ TOP UTILITY BAR ═══ */}
      <div className="bg-[#EFBF04] text-[#1a1a2e] text-xs">
        <div className="max-w-[1200px] mx-auto px-4 flex items-center justify-between h-8">
          <div className="flex items-center gap-3">
            <button onClick={fetchUserLocation} disabled={detectingLocation} className="flex items-center gap-1 hover:text-[#D62828] transition-colors">
              <svg className={`w-3 h-3 ${detectingLocation ? "animate-pulse" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="max-w-[200px] truncate">{detectingLocation ? "Detecting..." : userAddress || "Set location"}</span>
            </button>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <a href="/account" className="font-medium hover:text-[#D62828] transition-colors flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  {profile?.name || user.email}
                </a>
                <span className="text-[#1a1a2e]/30">|</span>
                <a href="/account" className="hover:text-[#D62828] transition-colors">My Orders</a>
                <span className="text-[#1a1a2e]/30">|</span>
                <button onClick={handleLogout} className="hover:text-[#D62828] transition-colors">Logout</button>
              </>
            ) : (
              <>
                <button onClick={() => window.location.href = "/auth?redirect=/grocery"} className="hover:text-[#D62828] transition-colors">Sign Up</button>
                <button onClick={() => window.location.href = "/auth?redirect=/grocery"} className="hover:text-[#D62828] transition-colors">Log In</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ MAIN HEADER WITH SEARCH ═══ */}
      <header style={{ backgroundColor: "#D62828" }} className="sticky top-0 z-50 shadow-md">
        <div className="max-w-[1200px] mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            {/* Logo */}
            <a href="/" className="flex-shrink-0">
              <span className="text-white font-black text-xl">88 Seven</span>
            </a>

            {/* Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="flex">
                <input
                  type="text"
                  placeholder="Search for products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-l-sm text-sm outline-none bg-white text-gray-800 placeholder-gray-400"
                />
                <button className="bg-[#c0392b] hover:bg-[#a93226] px-5 rounded-r-sm transition-colors">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notifications Bell */}
            {user && (
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative text-white flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-[#1a1a2e] text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{notifications.filter((n) => !n.read).length}</span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-10 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 overflow-hidden">
                    <div className="px-4 py-2 border-b flex items-center justify-between bg-gray-50">
                      <span className="text-sm font-bold text-gray-800">Notifications</span>
                      {notifications.filter((n) => !n.read).length > 0 && (
                        <button onClick={() => markAllNotificationsRead("customer", user.uid)} className="text-[10px] text-[#D62828] font-medium">Mark all read</button>
                      )}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="p-4 text-center text-gray-400 text-xs">No notifications yet</p>
                      ) : (
                        notifications.slice(0, 10).map((n) => (
                          <div key={n.id} className={`px-4 py-2.5 border-b border-gray-50 ${!n.read ? "bg-blue-50" : ""}`}>
                            <p className="text-xs font-bold text-gray-800">{n.title}</p>
                            <p className="text-[11px] text-gray-500">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart */}
            <button onClick={() => setShowCart(true)} className="relative text-white flex-shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <span className="absolute -top-1 -right-1 bg-white text-[#D62828] text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">{cartCount}</span>
            </button>

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#e63232] px-4 py-3 space-y-2 border-t border-white/10">
            <a href="#" className="block text-white text-sm py-1">Home</a>
            <a href="#products" className="block text-white text-sm py-1">Products</a>
            <a href="#promos" className="block text-white text-sm py-1">Promos</a>
            <a href="#about" className="block text-white text-sm py-1">About</a>
          </div>
        )}
      </header>

      {/* Delivery Type Banner */}
      {(() => {
        const now = new Date()
        const hour = now.getHours()
        const isSameDay = hour < 15 // Before 3PM
        return (
          <div className={`sticky top-[64px] z-40 px-4 py-1.5 ${isSameDay ? "bg-green-500" : "bg-blue-500"}`}>
            <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-2">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <p className="text-white text-[11px] font-bold">
                {isSameDay ? "Same-Day Delivery" : "Next-Day Delivery"}
                <span className="font-normal text-white/70 ml-1">
                  {isSameDay ? `• Order before 3:00 PM for same-day` : `• Orders after 3PM delivered tomorrow`}
                </span>
              </p>
            </div>
          </div>
        )
      })()}

      {/* ═══ MAIN CONTENT: SIDEBAR + HERO + PRODUCTS ═══ */}
      <div className="max-w-[1200px] mx-auto px-4 mt-5">
        <div className="flex gap-4">
          {/* LEFT SIDEBAR - Categories (Desktop) */}
          <aside className="hidden md:block w-[200px] flex-shrink-0">
            <div className="bg-white rounded-sm shadow-sm">
              <div className="px-3 py-2.5 border-b border-gray-100">
                <h3 className="font-bold text-sm text-[#1a1a2e]">Categories</h3>
              </div>
              <ul className="py-1">
                <li>
                  <button
                    onClick={() => setSelectedCategory("All")}
                    className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                      selectedCategory === "All" ? "text-[#D62828] font-semibold bg-red-50" : "text-gray-700 hover:text-[#D62828] hover:bg-gray-50"
                    }`}
                  >
                    🏪 All Products
                  </button>
                </li>
                {categoryList.map((cat) => (
                  <li key={cat.label}>
                    <button
                      onClick={() => setSelectedCategory(cat.label)}
                      className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                        selectedCategory === cat.label ? "text-[#D62828] font-semibold bg-red-50" : "text-gray-700 hover:text-[#D62828] hover:bg-gray-50"
                      }`}
                    >
                      {cat.emoji} {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          {/* RIGHT CONTENT */}
          <div className="flex-1 min-w-0">
            {/* HERO BANNER SLIDER */}
            <HeroSlider />



            {/* MOBILE CATEGORIES */}
            <div className="md:hidden mt-4 bg-white rounded-sm shadow-sm p-4">
              <h3 className="font-bold text-sm text-[#1a1a2e] mb-3">Categories</h3>
              <div className="grid grid-cols-4 gap-3">
                {categoryList.slice(0, 8).map((cat) => (
                  <button
                    key={cat.label}
                    onClick={() => setSelectedCategory(cat.label)}
                    className="flex flex-col items-center gap-1"
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <span className="text-[10px] text-gray-600 text-center leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PRODUCTS GRID */}
            <section id="products" className="mt-4">
              <div className="bg-white rounded-sm shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h2 className="font-bold text-base text-[#D62828] uppercase">
                    {selectedCategory === "All" ? "Daily Needs" : selectedCategory}
                  </h2>
                  {/* Category tabs on desktop */}
                  <div className="hidden md:flex gap-1 overflow-x-auto">
                    <button
                      onClick={() => setSelectedCategory("All")}
                      className={`px-3 py-1 text-xs rounded-sm transition-colors ${
                        selectedCategory === "All" ? "bg-[#D62828] text-white" : "text-gray-600 hover:text-[#D62828]"
                      }`}
                    >
                      All
                    </button>
                    {categories.slice(0, 5).map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1 text-xs rounded-sm transition-colors whitespace-nowrap ${
                          selectedCategory === cat ? "bg-[#D62828] text-white" : "text-gray-600 hover:text-[#D62828]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {loading ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-[1px] bg-gray-100 p-[1px]">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="bg-white p-3 animate-pulse">
                        <div className="aspect-square bg-gray-200 rounded mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-3/4 mb-1" />
                        <div className="h-4 bg-gray-200 rounded w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16">
                    <p className="text-gray-400 text-sm">No products found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-[1px] bg-gray-100 p-[1px]">
                    {filtered.map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={addToCart} />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ═══ POPUP BANNER MODAL ═══ */}
      {showPopup && popupBanner && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowPopup(false)} />
          <div className="relative animate-[scaleIn_0.3s_ease-out] max-w-md w-full">
            <button
              onClick={() => setShowPopup(false)}
              className="absolute -top-3 -right-3 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-red-500 z-10 text-lg font-bold"
            >&times;</button>
            {popupBanner.linkUrl ? (
              <a href={popupBanner.linkUrl} onClick={() => setShowPopup(false)}>
                <img src={popupBanner.imageUrl} alt="Promo" className="w-full rounded-xl shadow-2xl" />
              </a>
            ) : (
              <img src={popupBanner.imageUrl} alt="Promo" className="w-full rounded-xl shadow-2xl" />
            )}
          </div>
        </div>
      )}

      {/* ═══ ADDED TO CART MODAL ═══ */}
      {addedProduct && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAddedProduct(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm p-6 text-center animate-[scaleIn_0.2s_ease-out]">
            {/* Success checkmark */}
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="font-bold text-lg text-gray-800 mb-1">Added to Cart!</h3>
            {/* Product info */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 mt-3">
              <div className="w-14 h-14 bg-white rounded-lg flex-shrink-0 flex items-center justify-center border">
                {addedProduct.product.imageUrl ? (
                  <img src={addedProduct.product.imageUrl} className="w-12 h-12 object-contain" />
                ) : (
                  <span className="text-2xl">📦</span>
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{addedProduct.product.name}</p>
                <p className="text-[#D62828] font-bold text-sm">
                  ₱{((addedProduct.product.onSale && addedProduct.product.salePrice ? addedProduct.product.salePrice : addedProduct.product.price) * addedProduct.quantity).toFixed(2)}
                </p>
              </div>
            </div>
            {/* Quantity controls */}
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={() => {
                  if (addedProduct.quantity <= 1) {
                    updateQuantity(addedProduct.product.id, -1)
                    setAddedProduct(null)
                  } else {
                    updateQuantity(addedProduct.product.id, -1)
                    setAddedProduct({ ...addedProduct, quantity: addedProduct.quantity - 1 })
                  }
                }}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-600 transition-colors"
              >−</button>
              <span className="text-lg font-bold w-8 text-center">{addedProduct.quantity}</span>
              <button
                onClick={() => {
                  updateQuantity(addedProduct.product.id, 1)
                  setAddedProduct({ ...addedProduct, quantity: addedProduct.quantity + 1 })
                }}
                className="w-9 h-9 rounded-full bg-[#D62828] hover:bg-[#b71c1c] flex items-center justify-center text-lg font-bold text-white transition-colors"
              >+</button>
            </div>
            {/* Actions */}
            <div className="flex gap-3 mt-5">
              <button onClick={() => setAddedProduct(null)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Continue Shopping
              </button>
              <button onClick={() => { setAddedProduct(null); setShowCart(true) }} className="flex-1 bg-[#D62828] text-white py-2.5 rounded-lg text-sm font-bold hover:bg-[#b71c1c] transition-colors">
                View Cart ({cartCount})
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CART DRAWER ═══ */}
      {showCart && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-lg">Your Cart ({cartCount})</h2>
              <div className="flex items-center gap-3">
                {cart.length > 0 && (
                  <button onClick={() => { if (confirm("Clear all items from cart?")) setCart([]) }} className="text-xs text-red-500 hover:text-red-700 font-medium">Clear All</button>
                )}
                <button onClick={() => setShowCart(false)} className="text-gray-500 text-2xl leading-none">&times;</button>
              </div>
            </div>
            {cart.length === 0 ? (
              <p className="p-8 text-center text-gray-400">Your cart is empty</p>
            ) : (
              <>
                <div className="p-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center">
                        {item.product.imageUrl ? <img src={item.product.imageUrl} className="w-10 h-10 object-contain" /> : <span className="text-lg">📦</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{item.product.name}</p>
                        <p className="text-[#D62828] font-bold text-sm">₱{((item.product.onSale && item.product.salePrice ? item.product.salePrice : item.product.price) * item.quantity).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.product.id, -1)} className="w-7 h-7 rounded bg-gray-100 text-lg">-</button>
                        <span className="text-sm w-4 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)} className="w-7 h-7 rounded bg-gray-100 text-lg">+</button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Subtotal</span><span>₱{cartTotal.toFixed(2)}</span>
                  </div>
                  {cartDeposit > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-orange-600">Bottle Deposit (Pundo)</span><span className="text-orange-600">₱{cartDeposit.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold mb-4">
                    <span>Total</span><span className="text-[#D62828]">₱{(cartTotal + cartDeposit).toFixed(2)}</span>
                  </div>
                  <button onClick={() => { setShowCart(false); if (!user) { window.location.href = "/auth?redirect=/grocery" } else { setShowCheckout(true); if (!checkoutForm.lat) detectLocation() } }} className="w-full bg-[#D62828] text-white py-3 rounded font-bold">Checkout</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ═══ CHECKOUT MODAL ═══ */}
      {showCheckout && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCheckout(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            {/* Header */}
            <div className="bg-[#D62828] px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-white">Checkout</h2>
                <p className="text-white/70 text-xs">Complete your delivery details</p>
              </div>
              <button onClick={() => setShowCheckout(false)} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Contact Info */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Information</label>
                <div className="mt-2 space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">👤</span>
                    <input placeholder="Full Name" value={checkoutForm.name} onChange={(e) => setCheckoutForm({ ...checkoutForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828] outline-none transition-colors" />
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📱</span>
                    <input type="tel" inputMode="numeric" placeholder="Phone Number" value={checkoutForm.phone} onChange={(e) => setCheckoutForm({ ...checkoutForm, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828] outline-none transition-colors" />
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Address</label>
                <div className="mt-2 space-y-3">
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-400">📍</span>
                    <textarea
                      placeholder="Street address, barangay, city..."
                      value={checkoutForm.address}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, address: e.target.value })}
                      className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828] outline-none transition-colors resize-none"
                      rows={2}
                    />
                  </div>
                  {/* Detect Location Button */}
                  <button
                    onClick={detectLocation}
                    disabled={locating}
                    className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 rounded-lg py-2.5 text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    {locating ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                        Detecting your location...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Use My Current Location
                      </>
                    )}
                  </button>
                  {checkoutForm.lat !== 0 && (
                    <p className="text-[10px] text-green-600 flex items-center gap-1">✓ Location pinned ({checkoutForm.lat.toFixed(4)}, {checkoutForm.lng.toFixed(4)})</p>
                  )}
                  {/* Landmark (Required) */}
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🏠</span>
                    <input placeholder="Landmark (required) e.g. near school, beside sari-sari store" value={checkoutForm.landmark} onChange={(e) => setCheckoutForm({ ...checkoutForm, landmark: e.target.value })} className={`w-full border rounded-lg pl-10 pr-3 py-2.5 text-sm focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828] outline-none transition-colors ${!checkoutForm.landmark.trim() ? "border-red-300 bg-red-50/30" : "border-gray-200"}`} />
                    {!checkoutForm.landmark.trim() && <p className="text-[10px] text-red-500 mt-0.5 ml-1">* Landmark is required for delivery</p>}
                  </div>
                </div>
              </div>

              {/* Delivery Type */}
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                <svg className={`w-5 h-5 ${new Date().getHours() < 15 ? "text-green-500" : "text-blue-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                <div>
                  <p className={`text-sm font-bold ${new Date().getHours() < 15 ? "text-green-700" : "text-blue-700"}`}>{new Date().getHours() < 15 ? "Same-Day Delivery" : "Next-Day Delivery"}</p>
                  <p className="text-[10px] text-gray-400">{new Date().getHours() < 15 ? "Your order will be delivered today" : "Your order will be delivered tomorrow"}</p>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Payment Method</label>
                <div className="mt-2 space-y-2">
                  {/* COD */}
                  {paymentMethods.cod && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${checkoutForm.paymentMethod === "cod" ? "border-[#D62828] bg-red-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="payment" value="cod" checked={checkoutForm.paymentMethod === "cod"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "cod" })} className="accent-[#D62828]" />
                    <span className="text-2xl">💵</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Cash on Delivery</p>
                      <p className="text-[11px] text-gray-400">Pay cash when your order arrives</p>
                    </div>
                  </label>
                  )}

                  {/* Payroo Wallet */}
                  {user && paymentMethods.wallet && (
                    <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${checkoutForm.paymentMethod === "wallet" ? "border-[#7C3AED] bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="payment" value="wallet" checked={checkoutForm.paymentMethod === "wallet"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "wallet" })} className="accent-[#7C3AED]" disabled={walletBalance < (cartTotal + cartDeposit + deliveryFee)} />
                      <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">Payroo Wallet</p>
                        <p className="text-[11px] text-gray-400">Balance: <span className={`font-bold ${walletBalance >= (cartTotal + cartDeposit + deliveryFee) ? "text-green-600" : "text-red-500"}`}>₱{walletBalance.toFixed(2)}</span></p>
                      </div>
                      {walletBalance < (cartTotal + cartDeposit + deliveryFee) && (
                        <span className="text-[9px] bg-red-100 text-red-600 font-bold px-2 py-0.5 rounded-full">LOW</span>
                      )}
                    </label>
                  )}

                  {/* QR PH */}
                  {paymentMethods.qrph && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${checkoutForm.paymentMethod === "qrph" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="payment" value="qrph" checked={checkoutForm.paymentMethod === "qrph"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "qrph" })} className="accent-blue-600" />
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/><path strokeWidth="2" d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3v3M20 16v2"/></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">QR Ph</p>
                      <p className="text-[11px] text-gray-400">Scan QR with any PH banking app</p>
                    </div>
                    <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">INSTAPAY</span>
                  </label>
                  )}

                  {/* E-Wallets */}
                  {paymentMethods.ewallet && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${checkoutForm.paymentMethod === "ewallet" ? "border-[#00A0E3] bg-sky-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="payment" value="ewallet" checked={checkoutForm.paymentMethod === "ewallet"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "ewallet" })} className="accent-[#00A0E3]" />
                    <div className="flex gap-1">
                      <div className="w-7 h-7 bg-[#00AA13] rounded-md flex items-center justify-center text-white text-[9px] font-black">GP</div>
                      <div className="w-7 h-7 bg-[#1ABF8A] rounded-md flex items-center justify-center text-white text-[9px] font-black">M</div>
                      <div className="w-7 h-7 bg-[#EE4D2D] rounded-md flex items-center justify-center text-white text-[9px] font-black">SP</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">E-Wallet</p>
                      <p className="text-[11px] text-gray-400">GrabPay · Maya · ShopeePay</p>
                    </div>
                  </label>
                  )}

                  {/* Bank Transfer */}
                  {paymentMethods.bank && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${checkoutForm.paymentMethod === "bank" ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="payment" value="bank" checked={checkoutForm.paymentMethod === "bank"} onChange={() => setCheckoutForm({ ...checkoutForm, paymentMethod: "bank" })} className="accent-green-600" />
                    <div className="flex gap-1">
                      <div className="w-7 h-7 bg-[#CC0001] rounded-md flex items-center justify-center text-white text-[8px] font-black">BPI</div>
                      <div className="w-7 h-7 bg-[#005DAA] rounded-md flex items-center justify-center text-white text-[8px] font-black">UBP</div>
                      <div className="w-7 h-7 bg-[#005A9C] rounded-md flex items-center justify-center text-white text-[8px] font-black">RCBC</div>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">Bank Transfer</p>
                      <p className="text-[11px] text-gray-400">BPI · UnionBank · RCBC (Direct Debit)</p>
                    </div>
                  </label>
                  )}
                </div>
                {["qrph", "ewallet", "bank"].includes(checkoutForm.paymentMethod) && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[11px] text-blue-700">You'll be redirected to the Xendit secure payment page to complete your payment. Order is confirmed only after payment.</p>
                  </div>
                )}
                {checkoutForm.paymentMethod === "wallet" && walletBalance >= (cartTotal + cartDeposit + deliveryFee) && (
                  <div className="mt-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 flex items-start gap-2">
                    <svg className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[11px] text-purple-700">₱{(cartTotal + cartDeposit + deliveryFee).toFixed(2)} will be deducted from your Payroo Wallet. Remaining: ₱{(walletBalance - cartTotal - cartDeposit - deliveryFee).toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Additional Notes</label>
                <div className="mt-2 relative">
                  <span className="absolute left-3 top-3 text-gray-400">📝</span>
                  <textarea placeholder="Special instructions (optional)" value={checkoutForm.notes} onChange={(e) => setCheckoutForm({ ...checkoutForm, notes: e.target.value })} className="w-full border border-gray-200 rounded-lg pl-10 pr-3 py-2.5 text-sm focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828] outline-none transition-colors resize-none" rows={2} />
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Items ({cartCount})</span>
                  <span>₱{cartTotal.toFixed(2)}</span>
                </div>
                {cartDeposit > 0 && (
                  <div className="flex justify-between text-sm text-orange-600 mt-1">
                    <span>Bottle Deposit (Pundo)</span>
                    <span>₱{cartDeposit.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm mt-1">
                  <span className={deliveryFee === 0 ? "text-green-600" : "text-gray-600"}>Delivery Fee</span>
                  {deliveryFee === 0 ? (
                    <span className="text-green-600 font-bold">FREE</span>
                  ) : (
                    <span className="font-medium text-gray-600">₱{deliveryFee.toFixed(2)}</span>
                  )}
                </div>
                {deliveryFee === 0 && deliverySettings && (
                  <p className="text-[10px] text-green-600 mt-1">✓ Free delivery for orders ₱{deliverySettings.freeDeliveryMinOrder}+ within {deliverySettings.freeDeliveryArea}</p>
                )}
                {deliverySettings && cartTotal < deliverySettings.freeDeliveryMinOrder && deliveryFee > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1">Add ₱{(deliverySettings.freeDeliveryMinOrder - cartTotal).toFixed(0)} more for free delivery</p>
                )}
                <div className="border-t border-gray-200 mt-2 pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span className="text-[#D62828] text-lg">₱{(cartTotal + cartDeposit + deliveryFee).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50">
              <button
                onClick={handleCheckout}
                disabled={submitting || !checkoutForm.name || !checkoutForm.phone || !checkoutForm.address || !checkoutForm.landmark.trim()}
                className="w-full bg-[#D62828] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#b71c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg> Placing Order...</>
                ) : (
                  <>🛒 Place Order • ₱{(cartTotal + cartDeposit + deliveryFee).toFixed(2)}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AUTH MODAL ═══ */}
      {showAuth && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => { setShowAuth(false); setOtpSent(false); setAuthError("") }} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden animate-[scaleIn_0.2s_ease-out]">
            <div className="bg-[#D62828] px-6 py-4">
              <h2 className="font-bold text-lg text-white">{otpSent ? "Enter OTP" : "Login / Sign Up"}</h2>
              <p className="text-white/70 text-xs">{otpSent ? "We sent a code to your phone" : "Enter your details to continue"}</p>
            </div>
            <div className="p-6 space-y-4">
              {authError && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{authError}</div>}

              {!otpSent ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Mobile Number</label>
                    <div className="flex">
                      <span className="flex items-center px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-lg text-sm text-gray-600 font-medium">+63</span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="9XX XXX XXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                        className="flex-1 border border-gray-200 rounded-r-lg px-4 py-3 text-sm outline-none focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleSendOTP}
                    disabled={authLoading || phoneNumber.length < 10}
                    className="w-full bg-[#D62828] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#b71c1c] transition-colors disabled:opacity-40"
                  >
                    {authLoading ? "Sending..." : "Send OTP Code"}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-center text-sm text-gray-600">Code sent to <span className="font-bold">+63{phoneNumber}</span></p>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 mb-1 block">Enter 6-digit OTP</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                      onKeyDown={(e) => e.key === "Enter" && handleVerifyOTP()}
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 text-center text-lg tracking-[0.5em] font-bold outline-none focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828]"
                    />
                  </div>
                  <button
                    onClick={handleVerifyOTP}
                    disabled={authLoading || otpCode.length < 6}
                    className="w-full bg-[#D62828] text-white py-3 rounded-lg font-bold text-sm hover:bg-[#b71c1c] transition-colors disabled:opacity-40"
                  >
                    {authLoading ? "Verifying..." : "Verify & Login"}
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtpCode(""); setAuthError("") }} className="w-full text-center text-xs text-gray-500 hover:text-[#D62828]">
                    ← Change number
                  </button>
                </>
              )}

              <p className="text-center text-[10px] text-gray-400">By continuing, you agree to our Terms of Service</p>
            </div>
            <div id="recaptcha-container"></div>
          </div>
        </div>
      )}

      {/* ═══ FOOTER ═══ */}
      <InstallPrompt />
      <footer className="bg-[#EFBF04] text-[#1a1a2e] mt-10 py-8 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <a href="/" className="font-black">88 Seven</a>
              </div>
              <p className="text-[#1a1a2e]/70 text-sm">Your neighborhood grocery store. Quality products, everyday low prices.</p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 text-[#1a1a2e]">Quick Links</h4>
              <ul className="space-y-2 text-sm text-[#1a1a2e]/70">
                <li><a href="#" className="hover:text-[#1a1a2e]">Home</a></li>
                <li><a href="#products" className="hover:text-[#1a1a2e]">Products</a></li>
                <li><a href="#" className="hover:text-[#1a1a2e]">Promos</a></li>
                <li><a href="#" className="hover:text-[#1a1a2e]">About Us</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 text-[#1a1a2e]">Contact</h4>
              <ul className="space-y-2 text-sm text-[#1a1a2e]/70">
                <li>📍 Philippines</li>
                <li>✉️ hello@88seven.com</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#1a1a2e]/10 mt-6 pt-4 text-center">
            <p className="text-[#1a1a2e]/60 text-xs">© 2024 88 Seven Grocery. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
        <div className="max-w-lg mx-auto grid grid-cols-4 py-1.5">
          <a href="/" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[10px] font-medium">Home</span>
          </a>
          <a href="/grocery" className="flex flex-col items-center gap-0.5 py-1 text-[#D62828]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <span className="text-[10px] font-bold">Grocery</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <span className="text-[10px] font-medium">Orders</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-medium">Account</span>
          </a>
        </div>
      </nav>
    </main>
  )
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const hasDiscount = product.onSale && product.salePrice
  const displayPrice = hasDiscount ? product.salePrice! : product.price
  const discount = hasDiscount ? Math.round(((product.price - product.salePrice!) / product.price) * 100) : 0

  return (
    <div className="bg-white hover:shadow-md hover:-translate-y-[2px] transition-all duration-200 cursor-pointer group">
      {/* Image */}
      <div className="relative aspect-square bg-white p-2 flex items-center justify-center overflow-hidden">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
        ) : (
          <ProductPlaceholder category={product.category} />
        )}
        {hasDiscount && (
          <span className="absolute top-0 right-0 bg-[#D62828] text-white text-[10px] font-bold px-1.5 py-0.5">
            -{discount}%
          </span>
        )}
        {product.stock <= 5 && (
          <span className="absolute bottom-1 left-1 bg-orange-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm">
            Few Left
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-2 border-t border-gray-50">
        <h4 className="text-xs text-gray-800 line-clamp-2 leading-snug min-h-[32px]">{product.name}</h4>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[#D62828] font-bold text-sm">₱{displayPrice.toFixed(2)}</span>
          {hasDiscount && (
            <span className="text-gray-400 text-[10px] line-through">₱{product.price.toFixed(2)}</span>
          )}
        </div>
        {product.bottleDeposit ? (
          <p className="text-[10px] text-orange-600 mt-0.5">+ ₱{product.bottleDeposit} pundo/bottle</p>
        ) : null}
        <button onClick={() => onAdd(product)} className="w-full mt-2 bg-[#D62828] text-white text-xs py-1.5 rounded hover:bg-[#b71c1c] transition-colors">Add to Cart</button>
      </div>
    </div>
  )
}

function HeroSlider() {
  const [current, setCurrent] = useState(0)
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [loaded, setLoaded] = useState(false)

  const fallbackSlides: HeroSlide[] = [
    { id: "1", badge: "Express Delivery", title: "Fast Delivery", highlight: "To Your Doorstep", description: "Fresh groceries delivered in minutes. Free shipping on your first order!", imageUrl: "", bgColor: "#D62828", order: 1, enabled: true },
    { id: "2", badge: "New Arrivals", title: "Fresh Products", highlight: "Every Single Day", description: "Quality fruits, vegetables, and essentials sourced daily from local farms.", imageUrl: "", bgColor: "#1a1a2e", order: 2, enabled: true },
    { id: "3", badge: "Member Exclusive", title: "Save Up To", highlight: "50% Off Today", description: "Sign up now and unlock exclusive member deals and discounts!", imageUrl: "", bgColor: "#EFBF04", order: 3, enabled: true },
  ]

  useEffect(() => {
    async function load() {
      try {
        const data = await getHeroSlides()
        setSlides(data.length > 0 ? data : fallbackSlides)
      } catch {
        setSlides(fallbackSlides)
      } finally {
        setLoaded(true)
      }
    }
    load()
  }, [])

  useEffect(() => {
    if (slides.length <= 1) return
    const timer = setInterval(() => setCurrent((c) => (c + 1) % slides.length), 4000)
    return () => clearInterval(timer)
  }, [slides.length])

  if (!loaded || slides.length === 0) {
    return <div className="h-[200px] md:h-[280px] bg-gray-200 rounded-sm animate-pulse" />
  }

  const slide = slides[current]

  return (
    <div
      className="relative rounded-sm overflow-hidden shadow-sm h-[200px] md:h-[280px]"
      style={{
        backgroundColor: slide.bgColor,
        backgroundImage: slide.imageUrl
          ? `linear-gradient(to right,rgba(0,0,0,0.6),rgba(0,0,0,0.15)),url(${slide.imageUrl})`
          : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 flex flex-col justify-center items-start p-6 md:p-10">
        {slide.badge && (
          <span className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 mb-3 text-white text-[11px] font-bold uppercase tracking-wider">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z" /></svg>
            {slide.badge}
          </span>
        )}
        <h1 className="text-xl md:text-3xl font-black text-white leading-tight drop-shadow">
          {slide.title}<br />
          <span className="text-yellow-300">{slide.highlight}</span>
        </h1>
        <p className="text-white/80 mt-1.5 text-xs md:text-sm max-w-[260px] drop-shadow line-clamp-2">{slide.description}</p>
        <button className="mt-3 bg-white text-[#D62828] font-bold px-5 py-2 rounded-full text-xs hover:bg-gray-100 transition-colors shadow-md">
          Shop Now →
        </button>
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)} className={`h-2 rounded-full transition-all ${i === current ? "bg-white w-5" : "bg-white/50 w-2"}`} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProductPlaceholder({ category }: { category: string }) {
  return (
    <svg className="w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
    </svg>
  )
}

function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissed = localStorage.getItem("pwa-dismissed")
    if (dismissed) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }
    window.addEventListener("beforeinstallprompt", handler)

    // iOS detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
    if (isIOS && !isStandalone) setShow(true)

    return () => window.removeEventListener("beforeinstallprompt", handler)
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      await deferredPrompt.userChoice
      setDeferredPrompt(null)
    }
    setShow(false)
  }

  const handleDismiss = () => {
    setShow(false)
    localStorage.setItem("pwa-dismissed", "1")
  }

  if (!show) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[90] bg-white rounded-xl shadow-lg border border-gray-200 p-4 flex items-center gap-3 animate-[scaleIn_0.2s_ease-out]">
      <div className="w-10 h-10 bg-[#D62828] rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-white font-black text-[10px]">88</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-800">Install 88 Seven</p>
        <p className="text-xs text-gray-500">{deferredPrompt ? "Add to home screen for quick access" : "Tap Share → Add to Home Screen"}</p>
      </div>
      {deferredPrompt && (
        <button onClick={handleInstall} className="bg-[#D62828] text-white text-xs font-bold px-3 py-2 rounded-lg flex-shrink-0">Install</button>
      )}
      <button onClick={handleDismiss} className="text-gray-400 text-lg leading-none flex-shrink-0">&times;</button>
    </div>
  )
}
