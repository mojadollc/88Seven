"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { setAuth, getUser } from "@/lib/auth"

function AuthPage() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get("redirect") || "/"
  const defaultTab = searchParams.get("tab") || "login"
  const [tab, setTab] = useState<"login" | "register" | "partner">(defaultTab as any)
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" })
  const [partnerForm, setPartnerForm] = useState({ serviceType: "laundry", email: "", password: "", shopName: "", ownerName: "", phone: "", address: "", landmark: "", lat: 0, lng: 0, skills: "" })
  const [detectingLoc, setDetectingLoc] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  useEffect(() => {
    fetch("/api/settings/logo").then(r => r.json()).then(d => setLogoUrl(d.logoUrl || ""))
  }, [])

  useEffect(() => {
    const user = getUser()
    if (!user) return
    if (user.role === "driver") { window.location.href = "/driver"; return }
    if (user.role === "partner") { window.location.href = "/partner"; return }
    if (user.role === "provider") { window.location.href = "/provider"; return }
    if (user.role === "admin") { window.location.href = "/admin"; return }
    window.location.href = redirect
  }, [redirect])

  async function callAuth(body: object) {
    const res = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Authentication failed")
    return data
  }

  const handleCustomerAuth = async () => {
    setError(""); setLoading(true)
    try {
      const data = await callAuth({ action: tab === "login" ? "login" : "register", email: form.email, password: form.password, name: form.name, phone: form.phone, role: "customer" })
      setAuth(data.token, data.user)
      window.location.href = redirect
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handlePartnerRegister = async () => {
    setError("")
    if (!partnerForm.shopName || !partnerForm.ownerName || !partnerForm.phone || !partnerForm.address) { setError("All fields are required"); return }
    setLoading(true)
    const isProvider = partnerForm.serviceType === "home_services"
    try {
      const data = await callAuth({
        action: "register",
        email: partnerForm.email,
        password: partnerForm.password,
        name: partnerForm.ownerName,
        shopName: partnerForm.shopName,
        phone: partnerForm.phone,
        address: partnerForm.address,
        landmark: partnerForm.landmark,
        lat: partnerForm.lat,
        lng: partnerForm.lng,
        role: isProvider ? "provider" : "partner",
        skills: isProvider ? partnerForm.skills.split(",").map(s => s.trim()).filter(Boolean) : [],
      })
      setAuth(data.token, data.user)
      window.location.href = isProvider ? "/provider" : "/partner"
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#319F44] to-[#267a34] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <a href="/" className="inline-block">
            {logoUrl
              ? <img src={logoUrl} alt="Logo" className="h-12 object-contain" />
              : <h1 className="text-white text-2xl font-black tracking-tight">Gruwcer</h1>}
          </a>
          <p className="text-white/60 text-xs mt-1">Sign in to access all services</p>
        </div>

        <div className="flex bg-white/10 rounded-xl p-1 mb-4">
          {(["login", "register", "partner"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); setSuccess("") }}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors capitalize ${tab === t ? "bg-white text-[#319F44]" : "text-white/70"}`}>
              {t === "login" ? "Sign In" : t === "register" ? "Register" : "Partner"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#59EBC6]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-gray-800">{success}</p>
              <a href="/auth" className="inline-block mt-4 text-xs text-[#319F44] font-bold">← Back to Sign In</a>
            </div>
          ) : tab === "partner" ? (
            <>
              <h2 className="font-bold text-lg text-gray-800 mb-1">Partner Registration</h2>
              <p className="text-xs text-gray-400 mb-4">Register your business to start receiving orders</p>
              {error && <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
              <div className="space-y-3">
                {/* Service type dropdown */}
                <div>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1 block">Service Type</label>
                  <select
                    value={partnerForm.serviceType}
                    onChange={(e) => setPartnerForm({ ...partnerForm, serviceType: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600 bg-white"
                  >
                    <option value="laundry">👕 Laundry Partner — list your laundromat</option>
                    <option value="home_services">🔧 Home Services Provider — aircon, plumbing, electrical, etc.</option>
                  </select>
                </div>

                <input placeholder={partnerForm.serviceType === "laundry" ? "Shop / Business Name" : "Business / Brand Name"} value={partnerForm.shopName} onChange={(e) => setPartnerForm({ ...partnerForm, shopName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input placeholder="Owner Full Name" value={partnerForm.ownerName} onChange={(e) => setPartnerForm({ ...partnerForm, ownerName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input placeholder="Phone Number" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />

                {/* Skills — only for home services */}
                {partnerForm.serviceType === "home_services" && (
                  <input
                    placeholder="Skills (e.g. Aircon, Plumbing, Electrical)"
                    value={partnerForm.skills}
                    onChange={(e) => setPartnerForm({ ...partnerForm, skills: e.target.value })}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600"
                  />
                )}

                <div className="relative">
                  <input placeholder="Address" value={partnerForm.address} onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-24 text-sm outline-none focus:border-blue-600" />
                  <button type="button" onClick={() => {
                    if (!navigator.geolocation) return
                    setDetectingLoc(true)
                    navigator.geolocation.getCurrentPosition(async (pos) => {
                      try {
                        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
                        const d = await res.json()
                        setPartnerForm((f) => ({ ...f, address: d.display_name || "", lat: pos.coords.latitude, lng: pos.coords.longitude }))
                      } catch {} finally { setDetectingLoc(false) }
                    }, () => setDetectingLoc(false), { enableHighAccuracy: true })
                  }} disabled={detectingLoc} className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-lg">
                    {detectingLoc ? "..." : "📍 Detect"}
                  </button>
                </div>
                {partnerForm.lat > 0 && <p className="text-[9px] text-[#319F44]">✓ Location pinned</p>}
                <input placeholder="Landmark (optional)" value={partnerForm.landmark} onChange={(e) => setPartnerForm({ ...partnerForm, landmark: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input type="email" placeholder="Email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input type="password" placeholder="Password" value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <button onClick={handlePartnerRegister} disabled={loading || !partnerForm.email || !partnerForm.password} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40">
                  {loading ? "Registering..." : partnerForm.serviceType === "laundry" ? "Register as Laundry Partner" : "Register as Home Services Provider"}
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="font-bold text-lg text-gray-800 mb-1">{tab === "login" ? "Welcome Back" : "Create Account"}</h2>
              <p className="text-xs text-gray-400 mb-4">{tab === "login" ? "Sign in to your account" : "Register to start ordering"}</p>
              {error && <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
              <div className="space-y-3">
                {tab === "register" && (
                  <>
                    <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                    <input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                  </>
                )}
                <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleCustomerAuth()} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                <button onClick={handleCustomerAuth} disabled={loading || !form.email || !form.password} className="w-full bg-[#319F44] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40">
                  {loading ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="text-center mt-4">
          <a href="/" className="text-white/60 text-xs hover:text-white">← Back to Home</a>
        </div>
      </div>
    </main>
  )
}

export default function AuthWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#319F44] flex items-center justify-center"><div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthPage />
    </Suspense>
  )
}
