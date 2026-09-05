"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { setAuth, getUser } from "@/lib/auth"

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
    try {
      const data = await callAuth({ action: "register", email: partnerForm.email, password: partnerForm.password, name: partnerForm.ownerName, shopName: partnerForm.shopName, phone: partnerForm.phone, address: partnerForm.address, landmark: partnerForm.landmark, lat: partnerForm.lat, lng: partnerForm.lng, role: "partner" })
      setAuth(data.token, data.user)
      window.location.href = "/partner"
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  const handleRiderRegister = async () => {
    setError("")
    if (!riderForm.name || !riderForm.phone) { setError("Name and phone are required"); return }
    setLoading(true)
    try {
      await callAuth({ action: "register", email: riderForm.email, password: riderForm.password, name: riderForm.name, phone: riderForm.phone, role: "driver" })
      setSuccess("Rider account created! Your application is pending admin approval.")
      setRiderForm({ email: "", password: "", name: "", phone: "" })
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#4194AF] to-[#3a7d96] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-6">
          <a href="/" className="inline-block">
            <h1 className="text-white text-2xl font-black tracking-tight">Gruwcer</h1>
          </a>
          <p className="text-white/60 text-xs mt-1">Sign in to access all services</p>
        </div>

        <div className="flex bg-white/10 rounded-xl p-1 mb-4">
          {(["login", "register", "partner", "rider"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setError(""); setSuccess("") }}
              className={`flex-1 py-2 rounded-lg text-[10px] font-bold transition-colors capitalize ${tab === t ? "bg-white text-[#4194AF]" : "text-white/70"}`}>
              {t === "login" ? "Sign In" : t === "register" ? "Register" : t === "partner" ? "Partner" : "Rider"}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          {success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-[#93D569]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-gray-800">{success}</p>
              <a href="/auth" className="inline-block mt-4 text-xs text-[#4194AF] font-bold">← Back to Sign In</a>
            </div>
          ) : tab === "rider" ? (
            <>
              <h2 className="font-bold text-lg text-gray-800 mb-1">Rider Registration</h2>
              <p className="text-xs text-gray-400 mb-4">Register as a delivery rider</p>
              {error && <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
              <div className="space-y-3">
                <input placeholder="Full Name" value={riderForm.name} onChange={(e) => setRiderForm({ ...riderForm, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <input placeholder="Phone Number" value={riderForm.phone} onChange={(e) => setRiderForm({ ...riderForm, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <input type="email" placeholder="Email" value={riderForm.email} onChange={(e) => setRiderForm({ ...riderForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <input type="password" placeholder="Password" value={riderForm.password} onChange={(e) => setRiderForm({ ...riderForm, password: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-green-600" />
                <button onClick={handleRiderRegister} disabled={loading || !riderForm.email || !riderForm.password} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40">
                  {loading ? "Registering..." : "Register as Rider"}
                </button>
              </div>
            </>
          ) : tab === "partner" ? (
            <>
              <h2 className="font-bold text-lg text-gray-800 mb-1">Partner Registration</h2>
              <p className="text-xs text-gray-400 mb-4">Register your laundromat as a partner</p>
              {error && <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 rounded-lg mb-3">{error}</div>}
              <div className="space-y-3">
                <input placeholder="Shop / Business Name" value={partnerForm.shopName} onChange={(e) => setPartnerForm({ ...partnerForm, shopName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input placeholder="Owner Full Name" value={partnerForm.ownerName} onChange={(e) => setPartnerForm({ ...partnerForm, ownerName: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input placeholder="Phone Number" value={partnerForm.phone} onChange={(e) => setPartnerForm({ ...partnerForm, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <div className="relative">
                  <input placeholder="Shop Address" value={partnerForm.address} onChange={(e) => setPartnerForm({ ...partnerForm, address: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-24 text-sm outline-none focus:border-blue-600" />
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
                {partnerForm.lat > 0 && <p className="text-[9px] text-[#4194AF]">✓ Location pinned</p>}
                <input placeholder="Landmark" value={partnerForm.landmark} onChange={(e) => setPartnerForm({ ...partnerForm, landmark: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input type="email" placeholder="Email" value={partnerForm.email} onChange={(e) => setPartnerForm({ ...partnerForm, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <input type="password" placeholder="Password" value={partnerForm.password} onChange={(e) => setPartnerForm({ ...partnerForm, password: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-600" />
                <button onClick={handlePartnerRegister} disabled={loading || !partnerForm.email || !partnerForm.password} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40">
                  {loading ? "Registering..." : "Register as Partner"}
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
                    <input placeholder="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4194AF]" />
                    <input placeholder="Phone Number" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4194AF]" />
                  </>
                )}
                <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4194AF]" />
                <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} onKeyDown={(e) => e.key === "Enter" && handleCustomerAuth()} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#4194AF]" />
                <button onClick={handleCustomerAuth} disabled={loading || !form.email || !form.password} className="w-full bg-[#4194AF] text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40">
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
    <Suspense fallback={<div className="min-h-screen bg-[#4194AF] flex items-center justify-center"><div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin" /></div>}>
      <AuthPage />
    </Suspense>
  )
}
