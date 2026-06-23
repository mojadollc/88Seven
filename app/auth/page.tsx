"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { customerLogin, customerRegister, registerPartner, registerRider, onCustomerAuthChange, getPartnerProfile, getDrivers } from "@/lib/firebase"
import { Suspense } from "react"

function AuthPage() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/"
  const defaultTab = searchParams.get("tab") || "login"
  const [tab, setTab] = useState<"login" | "register" | "partner" | "rider">(defaultTab as any)
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" })
  const [partnerForm, setPartnerForm] = useState({ email: "", password: "", shopName: "", ownerName: "", phone: "", address: "", landmark: "", lat: 0, lng: 0 })
  const [detectingLoc, setDetectingLoc] = useState(false)
  const [riderForm, setRiderForm] = useState({ email: "", password: "", name: "", phone: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")

  // Redirect if already logged in
  useEffect(() => {
    const unsub = onCustomerAuthChange(async (u) => {
      if (u && (tab === "login" || tab === "register")) {
        // Check if rider
        const allDrivers = await getDrivers()
        const rider = allDrivers.find((d) => (d as any).uid === u.uid || d.email === u.email)
        if (rider) { window.location.href = "/driver"; return }
        // Check if partner
        const partner = await getPartnerProfile(u.uid)
        if (partner) { window.location.href = "/partner"; return }
        // Customer
        window.location.href = redirect
      }
    })
    return () => unsub()
  }, [redirect, tab])

  const handleCustomerAuth = async () => {
    setError("")
    setLoading(true)
    try {
      if (tab === "login") {
        await customerLogin(form.email, form.password)
      } else {
        if (!form.name || !form.phone) { setError("Name and phone are required"); setLoading(false); return }
        await customerRegister(form.email, form.password, form.name, form.phone)
      }
      window.location.href = redirect
    } catch (e: any) {
      setError(e.message?.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "") || "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  const handlePartnerRegister = async () => {
    setError("")
    if (!partnerForm.shopName || !partnerForm.ownerName || !partnerForm.phone || !partnerForm.address) {
      setError("All fields are required")
      return
    }
    setLoading(true)
    try {
      await registerPartner(partnerForm.email, partnerForm.password, {
        shopName: partnerForm.shopName,
        ownerName: partnerForm.ownerName,
        phone: partnerForm.phone,
        address: partnerForm.address,
        landmark: partnerForm.landmark || undefined,
        lat: partnerForm.lat || undefined,
        lng: partnerForm.lng || undefined,
      })
      window.location.href = "/partner"
      setPartnerForm({ email: "", password: "", shopName: "", ownerName: "", phone: "", address: "", landmark: "", lat: 0, lng: 0 })
    } catch (e: any) {
      setError(e.message?.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "") || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  const handleRiderRegister = async () => {
    setError("")
    if (!riderForm.name || !riderForm.phone) { setError("Name and phone are required"); return }
    setLoading(true)
    try {
      await registerRider(riderForm.email, riderForm.password, { name: riderForm.name, phone: riderForm.phone })
      setSuccess("Rider account created! Your application is pending admin approval. You can login at /driver once approved.")
      setRiderForm({ email: "", password: "", name: "", phone: "" })
    } catch (e: any) {
      setError(e.message?.replace("Firebase: ", "").replace(/\(auth\/.*\)/, "") || "Registration failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#D62828] to-[#a11d1d] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background SVG vectors */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]">
        {/* Shopping cart */}
        <svg className="absolute top-[8%] left-[5%] w-24 h-24 rotate-[-15deg]" fill="white" viewBox="0 0 24 24"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>
        {/* Delivery truck */}
        <svg className="absolute top-[15%] right-[8%] w-28 h-28 rotate-[10deg]" fill="white" viewBox="0 0 24 24"><path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
        {/* Washing machine / laundry */}
        <svg className="absolute bottom-[20%] left-[3%] w-20 h-20 rotate-[12deg]" fill="white" viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-6 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm3-6c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3zM8 5c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1zm4 0c0-.55.45-1 1-1s1 .45 1 1-.45 1-1 1-1-.45-1-1z"/></svg>
        {/* Grocery bag */}
        <svg className="absolute bottom-[12%] right-[6%] w-22 h-22 rotate-[-8deg]" fill="white" viewBox="0 0 24 24"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/></svg>
        {/* Bottle */}
        <svg className="absolute top-[40%] left-[10%] w-14 h-14 rotate-[20deg]" fill="white" viewBox="0 0 24 24"><path d="M5 22h14V9l-3-3V3H8v3L5 9v13zm5-3H8v-3h2v3zm0-5H8v-3h2v3zm4 5h-2v-3h2v3zm0-5h-2v-3h2v3z"/></svg>
        {/* Home services / wrench */}
        <svg className="absolute top-[45%] right-[4%] w-16 h-16 rotate-[-25deg]" fill="white" viewBox="0 0 24 24"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z"/></svg>
        {/* Food / apple */}
        <svg className="absolute top-[65%] left-[25%] w-12 h-12 rotate-[5deg]" fill="white" viewBox="0 0 24 24"><path d="M20 10c-.13-3.86-3.19-4.3-4.39-3.66-.93-1.33-2.58-2.09-3.61-2.34.76-.8 1.75-1.26 2-1.36V1c-1.52.48-3.03 1.47-3.88 2.82-.56-.38-1.2-.63-1.84-.78C7.58 2.84 6.59 2.93 5.73 3.27c-.19.08-.37.16-.54.25C4.87 2.08 4.36 1.08 4 1c-.11.52-.3 1.12-.28 1.63.01.37.26.93.54 1.37-.37.44-.67.92-.87 1.44C2.72 7.13 3.38 9.13 5 10.39c.18.14.39.28.62.4C5.36 13.42 5 17.83 5 20c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2 0-2.17-.36-6.58-.62-9.21 1.44-.79 1.74-2.28 1.62-2.79z"/></svg>
        {/* Snack / cookie */}
        <svg className="absolute bottom-[35%] right-[20%] w-14 h-14 rotate-[15deg]" fill="white" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/></svg>
        {/* Medicine / pill */}
        <svg className="absolute top-[25%] left-[30%] w-10 h-10 rotate-[30deg]" fill="white" viewBox="0 0 24 24"><path d="M4.22 11.29l5.07-5.07c1.95-1.95 5.12-1.95 7.07 0s1.95 5.12 0 7.07l-5.07 5.07c-1.95 1.95-5.12 1.95-7.07 0s-1.95-5.12 0-7.07zm1.41 1.41c-1.17 1.17-1.17 3.07 0 4.24s3.07 1.17 4.24 0l2.54-2.54-4.24-4.24-2.54 2.54z"/></svg>
        {/* Location pin */}
        <svg className="absolute bottom-[5%] left-[45%] w-12 h-12" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-6">
          <a href="/" className="inline-block">
            <h1 className="text-white text-2xl font-black">88 Seven</h1>
          </a>
          <p className="text-white/60 text-xs mt-1">Sign in to access all services</p>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white/10 rounded-xl p-1 mb-4">
          <button onClick={() => { setTab("login"); setError(""); setSuccess("") }} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${tab === "login" ? "bg-white text-[#D62828]" : "text-white/70"}`}>
            Sign In
          </button>
          <button onClick={() => { setTab("register"); setError(""); setSuccess("") }} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${tab === "register" ? "bg-white text-[#D62828]" : "text-white/70"}`}>
            Register
          </button>
          <button onClick={() => { setTab("partner"); setError(""); setSuccess("") }} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${tab === "partner" ? "bg-white text-blue-600" : "text-white/70"}`}>
            Partner
          </button>
          <button onClick={() => { setTab("rider"); setError(""); setSuccess("") }} className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors ${tab === "rider" ? "bg-white text-green-600" : "text-white/70"}`}>
            Rider
          </button>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-gray-800">{success}</p>
              <a href="/auth" className="inline-block mt-4 text-xs text-[#D62828] font-bold">← Back to Sign In</a>
            </div>
          ) : tab === "rider" ? (
            <>
              <h2 className="font-bold text-lg text-gray-800 mb-1">Rider Registration</h2>
              <p className="text-xs text-gray-400 mb-4">Register as a delivery rider/driver</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
              <div className="space-y-3">
                <input placeholder="Full Name" value={riderForm.name} onChange={(e) => setRiderForm({ ...riderForm, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <input placeholder="Phone Number" value={riderForm.phone} onChange={(e) => setRiderForm({ ...riderForm, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <input type="email" placeholder="Email" value={riderForm.email} onChange={(e) => setRiderForm({ ...riderForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <input type="password" placeholder="Password" value={riderForm.password} onChange={(e) => setRiderForm({ ...riderForm, password: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <button onClick={handleRiderRegister} disabled={loading || !riderForm.email || !riderForm.password} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 transition-colors disabled:opacity-40">
                  {loading ? "Registering..." : "Register as Rider"}
                </button>
              </div>
            </>
          ) : tab === "partner" ? (
            <>
              <h2 className="font-bold text-lg text-gray-800 mb-1">Partner Registration</h2>
              <p className="text-xs text-gray-400 mb-4">Register your laundromat as a partner</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
              <div className="space-y-3">
                <input placeholder="Shop / Business Name" value={partnerForm.shopName} onChange={(e) => setPartnerForm({ ...partnerForm, shopName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input placeholder="Owner Full Name" value={partnerForm.ownerName} onChange={(e) => setPartnerForm({ ...partnerForm, ownerName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input placeholder="Phone Number" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <div>
                  <div className="relative">
                    <input placeholder="Shop Address" value={partnerForm.address} onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-20 text-sm outline-none focus:border-blue-600" />
                    <button
                      type="button"
                      onClick={() => {
                        if (!navigator.geolocation) return
                        setDetectingLoc(true)
                        navigator.geolocation.getCurrentPosition(
                          async (pos) => {
                            const { latitude, longitude } = pos.coords
                            try {
                              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
                              const data = await res.json()
                              setPartnerForm((f) => ({ ...f, address: data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, lat: latitude, lng: longitude }))
                            } catch {
                              setPartnerForm((f) => ({ ...f, lat: latitude, lng: longitude }))
                            } finally { setDetectingLoc(false) }
                          },
                          () => { setDetectingLoc(false) },
                          { enableHighAccuracy: true }
                        )
                      }}
                      disabled={detectingLoc}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg"
                    >
                      {detectingLoc ? "..." : "📍 Auto-detect"}
                    </button>
                  </div>
                  {partnerForm.lat > 0 && <p className="text-[9px] text-green-600 mt-1">✓ Location pinned</p>}
                </div>
                <input placeholder="Landmark (e.g. Near Mercury Drug, beside 7-Eleven)" value={partnerForm.landmark} onChange={(e) => setPartnerForm({ ...partnerForm, landmark: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input type="email" placeholder="Email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input type="password" placeholder="Password" value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <button onClick={handlePartnerRegister} disabled={loading || !partnerForm.email || !partnerForm.password} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors disabled:opacity-40">
                  {loading ? "Registering..." : "Register as Partner"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-bold text-lg text-gray-800 mb-1">{tab === "login" ? "Welcome Back" : "Create Account"}</h2>
              <p className="text-xs text-gray-400 mb-4">{tab === "login" ? "Sign in to your account" : "Register to start ordering"}</p>
              {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
              <div className="space-y-3">
                {tab === "register" && (
                  <>
                    <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D62828]" />
                    <input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D62828]" />
                  </>
                )}
                <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D62828]" />
                <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleCustomerAuth()} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#D62828]" />
                <button onClick={handleCustomerAuth} disabled={loading || !form.email || !form.password} className="w-full bg-[#D62828] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#b71c1c] transition-colors disabled:opacity-40">
                  {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Back link */}
        <div className="text-center mt-4">
          <a href="/" className="text-white/60 text-xs hover:text-white">← Back to Home</a>
        </div>
      </div>
    </main>
  )
}

export default function AuthWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#D62828] flex items-center justify-center"><div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthPage />
    </Suspense>
  )
}
