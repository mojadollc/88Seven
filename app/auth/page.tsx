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
    <main className="min-h-screen bg-gradient-to-b from-[#D62828] to-[#a11d1d] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
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
