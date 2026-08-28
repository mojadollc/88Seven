"use client"

import { useEffect, useState } from "react"
// Firebase auth removed


const SERVICE_CATEGORIES = [
  {
    id: "aircon",
    name: "Aircon Services",
    icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z",
    color: "bg-cyan-600",
    services: [
      { id: "aircon_cleaning", name: "Aircon Cleaning", price: 350, unit: "per unit", desc: "General cleaning & filter wash" },
      { id: "aircon_repair", name: "Aircon Repair", price: 500, unit: "diagnosis", desc: "Troubleshoot & fix issues" },
      { id: "aircon_install", name: "Aircon Installation", price: 1500, unit: "per unit", desc: "New unit installation" },
      { id: "aircon_freon", name: "Freon Refill", price: 800, unit: "per unit", desc: "Refrigerant recharge" },
    ],
  },
  {
    id: "plumbing",
    name: "Plumbing",
    icon: "M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z",
    color: "bg-blue-700",
    services: [
      { id: "plumb_leak", name: "Leak Repair", price: 300, unit: "per job", desc: "Fix pipe leaks & drips" },
      { id: "plumb_clog", name: "Drain Unclogging", price: 250, unit: "per drain", desc: "Clear blocked drains" },
      { id: "plumb_install", name: "Fixture Installation", price: 500, unit: "per fixture", desc: "Install faucet, toilet, etc." },
    ],
  },
  {
    id: "electrical",
    name: "Electrical",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "bg-yellow-600",
    services: [
      { id: "elec_wiring", name: "Wiring Repair", price: 400, unit: "per job", desc: "Fix faulty wiring" },
      { id: "elec_outlet", name: "Outlet Installation", price: 250, unit: "per outlet", desc: "Install new power outlet" },
      { id: "elec_light", name: "Light Fixture", price: 200, unit: "per fixture", desc: "Install or replace lights" },
    ],
  },
  {
    id: "cleaning",
    name: "House Cleaning",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    color: "bg-green-600",
    services: [
      { id: "clean_general", name: "General Cleaning", price: 500, unit: "per session", desc: "Full house cleaning" },
      { id: "clean_deep", name: "Deep Cleaning", price: 1200, unit: "per session", desc: "Intensive deep clean" },
      { id: "clean_move", name: "Move-in/Move-out", price: 1500, unit: "per session", desc: "Post-construction or moving" },
    ],
  },
]

type ServiceBooking = {
  id: string
  categoryId: string
  categoryName: string
  serviceId: string
  serviceName: string
  price: number
  address: string
  phone: string
  scheduledDate: string
  scheduledTime: string
  notes: string
  status: string
  customerId: string
  customerName: string
  createdAt: any
}

const STATUS_COLORS: Record<string, string> = {
  awaiting_payment: "bg-orange-100 text-orange-800",
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-green-100 text-green-900",
}

export default function ServicesPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [walletBalance, setWalletBalance] = useState(0)
  const [pmConfig, setPmConfig] = useState<any>({ cod: true, wallet: true, qrph: true, ewallet: true, bank: true, xendit: true })
  const [bookings, setBookings] = useState<ServiceBooking[]>([])
  const [selectedCategory, setSelectedCategory] = useState<typeof SERVICE_CATEGORIES[0] | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [selectedService, setSelectedService] = useState<any>(null)
  const [form, setForm] = useState({ address: "", phone: "", date: "", time: "09:00", notes: "", paymentMethod: "cod" })
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<"browse" | "bookings">("browse")

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    if (!u) return
    setUser(u)
    const token = localStorage.getItem("token")
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((p: any) => {
        if (!p) return
        setProfile(p)
        setWalletBalance(p.walletBalance || 0)
        fetch("/api/settings/payment-methods").then(r => r.ok ? r.json() : {}).then((pm: any) => setPmConfig((prev: any) => ({ ...prev, ...pm })))
        setForm((f: any) => ({ ...f, address: p.address || "", phone: p.phone || "" }))
      })
  }, [])

  useEffect(() => {
    if (!user) return
    const iv = setInterval(async () => {
      const r = await fetch(`/api/service-bookings?customerId=${user.uid}`)
      if (r.ok) {
        const allBookings = await r.json()
        setBookings(allBookings)
        allBookings.forEach(async (b: any) => {
          if (b.status === "awaiting_payment" && b.paymentExpiresAt) {
            if (new Date() > new Date(b.paymentExpiresAt)) {
              await fetch(`/api/service-bookings/${b.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) })
            }
          }
        })
      }
    }, 5000)
    return () => clearInterval(iv)
  }, [user])

  // Auto-detect location
  useEffect(() => {
    const saved = localStorage.getItem("user_location")
    if (saved) {
      const loc = JSON.parse(saved)
      setForm((f) => ({ ...f, address: loc.address }))
    }
  }, [])

  const handleBook = async () => {
    if (!user || !selectedService || !form.address || !form.phone || !form.date) return
    setSubmitting(true)
    const bookingData = {
      categoryId: selectedCategory!.id,
      categoryName: selectedCategory!.name,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      price: selectedService.price,
      address: form.address,
      phone: form.phone,
      scheduledDate: form.date,
      scheduledTime: form.time,
      notes: form.notes,
      status: ["xendit", "qrph", "ewallet", "bank"].includes(form.paymentMethod) ? "awaiting_payment" : "pending",
      paymentExpiresAt: ["xendit", "qrph", "ewallet", "bank"].includes(form.paymentMethod) ? new Date(Date.now() + 10 * 60 * 1000) : null,
      customerId: user.uid,
      customerName: profile?.name || "",
      paymentMethod: form.paymentMethod,
    }
    const res = await fetch("/api/service-bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(bookingData) })
    const docRef = await res.json()

    if (form.paymentMethod === "wallet") {
      await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: user.id, ownerType: "customer", type: "deduction", amount: -selectedService.price, orderId: docRef.id, note: `Service - ${selectedService.name}` }) })
      setWalletBalance((prev: number) => prev - selectedService.price)
      setShowBooking(false)
      setSubmitting(false)
      return
    }

    if (["xendit", "qrph", "ewallet", "bank"].includes(form.paymentMethod)) {
      const { createXenditPayment } = await import("@/lib/xendit")
      const paymentMethods =
        form.paymentMethod === "qrph" ? ["QRPH"] :
        form.paymentMethod === "ewallet" ? ["GRABPAY", "MAYA", "SHOPEEPAY"] :
        form.paymentMethod === "bank" ? ["DD_BPI", "DD_UBP", "DD_RCBC"] :
        ["GRABPAY", "MAYA", "SHOPEEPAY", "QRPH", "DD_BPI", "DD_UBP", "DD_RCBC"]
      const payment = await createXenditPayment({
        amount: selectedService.price,
        description: `${selectedService.name} - Home Service`,
        externalId: `service_${docRef.id}`,
        paymentMethods,
        successRedirectUrl: `${window.location.origin}/services`,
        failureRedirectUrl: `${window.location.origin}/payment/failed?id=${docRef.id}&service=services`,
      })
      if (payment?.invoiceUrl) {
        window.location.href = payment.invoiceUrl
        return
      }
    }

    setSubmitting(false)
    setShowBooking(false)
    setSelectedService(null)
    setTab("bookings")
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-teal-600 text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm">Back</span>
          </a>
          <h1 className="font-bold text-sm">Home Services</h1>
          <div className="w-5" />
        </div>
      </header>

      <div className="max-w-2xl mx-auto pb-8">
        {/* Tabs */}
        <div className="bg-white flex border-b border-gray-200 sticky top-[48px] z-20">
          <button onClick={() => setTab("browse")} className={`flex-1 py-3 text-xs font-bold relative ${tab === "browse" ? "text-teal-600" : "text-gray-400"}`}>
            Browse Services
            {tab === "browse" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />}
          </button>
          <button onClick={() => setTab("bookings")} className={`flex-1 py-3 text-xs font-bold relative ${tab === "bookings" ? "text-teal-600" : "text-gray-400"}`}>
            My Bookings {bookings.length > 0 && `(${bookings.length})`}
            {tab === "bookings" && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-teal-600 rounded-full" />}
          </button>
        </div>

        {tab === "browse" && (
          <div className="px-4 pt-4 space-y-4">
            {!user && (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm mb-3">Sign in to book services</p>
                <a href="/auth?redirect=/services" className="inline-block bg-teal-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold">Sign In</a>
              </div>
            )}

            {user && SERVICE_CATEGORIES.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-10 h-10 ${cat.color} rounded-xl flex items-center justify-center`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={cat.icon} /></svg>
                  </div>
                  <h3 className="font-bold text-sm text-gray-800">{cat.name}</h3>
                </div>
                <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                  {cat.services.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => { setSelectedCategory(cat); setSelectedService(svc); setShowBooking(true) }}
                      className="text-left border border-gray-100 rounded-lg p-3 hover:border-teal-300 hover:bg-teal-50 transition-colors"
                    >
                      <p className="text-xs font-bold text-gray-800">{svc.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{svc.desc}</p>
                      <p className="text-sm font-bold text-teal-600 mt-1">₱{svc.price} <span className="text-[10px] font-normal text-gray-400">{svc.unit}</span></p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "bookings" && (
          <div className="px-4 pt-4 space-y-3">
            {bookings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
                <p className="text-gray-400 text-sm">No bookings yet</p>
              </div>
            ) : bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[b.status] || "bg-gray-100 text-gray-600"}`}>{b.status.replace(/_/g, " ")}</span>
                  <span className="text-sm font-bold text-teal-600">₱{b.price}</span>
                </div>
                <p className="text-sm font-bold text-gray-800">{b.serviceName}</p>
                <p className="text-[10px] text-gray-400">{b.categoryName}</p>
                <div className="mt-2 space-y-1 text-xs text-gray-500">
                  <p>📅 {b.scheduledDate} at {b.scheduledTime}</p>
                  <p>📍 {b.address}</p>
                </div>
                <p className="text-[10px] text-gray-300 mt-2">{b.createdAt?.toLocaleDateString?.() || ""}</p>
                {/* Awaiting payment */}
                {b.status === "awaiting_payment" && (
                  <div className="mt-3 space-y-2">
                    <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-orange-700 font-bold">⏳ Awaiting payment — auto-cancels in 10 minutes</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          await fetch(`/api/service-bookings/b.id`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ status: "cancelled" }) })
                        }}
                        className="flex-1 border border-green-200 text-green-700 py-2.5 rounded-lg text-xs font-bold hover:bg-green-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={async () => {
                          const { createXenditPayment } = await import("@/lib/xendit")
                          const payment = await createXenditPayment({
                            amount: b.price,
                            description: `${b.serviceName} - Home Service`,
                            externalId: `service_${b.id}`,
                            successRedirectUrl: `${window.location.origin}/services`,
                            failureRedirectUrl: `${window.location.origin}/payment/failed?id=${b.id}&service=services`,
                          })
                          if (payment?.invoiceUrl) window.location.href = payment.invoiceUrl
                        }}
                        className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-teal-700"
                      >
                        Pay Now — ₱{b.price}
                      </button>
                    </div>
                  </div>
                )}
                {/* Cancel for pending */}
                {b.status === "pending" && (
                  <button
                    onClick={async () => {
                      if (!confirm("Cancel this booking?")) return
                      await fetch(`/api/service-bookings/b.id`, { method: "PATCH", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ status: "cancelled" }) })
                    }}
                    className="w-full mt-3 border border-green-200 text-green-700 py-2 rounded-lg text-xs font-bold hover:bg-green-50"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {showBooking && selectedService && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBooking(false)} />
          <div className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-600 px-6 py-4 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg text-white">Book Service</h2>
                <p className="text-white/70 text-xs">{selectedService.name}</p>
              </div>
              <button onClick={() => setShowBooking(false)} className="text-white/80 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Service Info */}
              <div className="bg-teal-50 rounded-lg p-3">
                <p className="text-sm font-bold text-teal-800">{selectedService.name}</p>
                <p className="text-xs text-teal-600">{selectedCategory?.name} • {selectedService.desc}</p>
                <p className="text-lg font-bold text-teal-700 mt-1">₱{selectedService.price} <span className="text-xs font-normal">{selectedService.unit}</span></p>
              </div>

              {/* Schedule */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Preferred Date</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} min={new Date().toISOString().split("T")[0]} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Preferred Time</label>
                <select value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-teal-600">
                  <option value="08:00">8:00 AM</option>
                  <option value="09:00">9:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="13:00">1:00 PM</option>
                  <option value="14:00">2:00 PM</option>
                  <option value="15:00">3:00 PM</option>
                  <option value="16:00">4:00 PM</option>
                </select>
              </div>

              {/* Address & Phone */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Service Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-teal-600 resize-none" rows={2} />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "") })} placeholder="09xxxxxxxxx" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Notes (optional)</label>
                <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Any special instructions" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-teal-600" />
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{selectedService.name}</span>
                  <span className="font-bold">₱{selectedService.price}</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Payment Method</label>
                <div className="mt-2 space-y-2">
                  {/* COD */}
                  {pmConfig.cod && (
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${form.paymentMethod === "cod" ? "border-[#16A34A] bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="spay" value="cod" checked={form.paymentMethod === "cod"} onChange={() => setForm({ ...form, paymentMethod: "cod" })} className="accent-[#16A34A]" />
                    <span className="text-2xl">💵</span>
                    <div>
                      <p className="text-sm font-bold text-gray-800">Cash on Delivery</p>
                      <p className="text-[11px] text-gray-400">Pay cash when service is done</p>
                    </div>
                  </label>
                  )}

                  {/* Gruwcer Wallet */}
                  {user && selectedService && pmConfig.wallet && (
                    <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${form.paymentMethod === "wallet" ? "border-[#7C3AED] bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}>
                      <input type="radio" name="spay" value="wallet" checked={form.paymentMethod === "wallet"} onChange={() => setForm({ ...form, paymentMethod: "wallet" })} className="accent-[#7C3AED]" disabled={walletBalance < selectedService.price} />
                      <div className="w-8 h-8 bg-[#7C3AED] rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">Gruwcer Wallet</p>
                        <p className="text-[11px] text-gray-400">Balance: <span className={`font-bold ${walletBalance >= selectedService.price ? "text-green-600" : "text-green-500"}`}>₱{walletBalance.toFixed(2)}</span></p>
                      </div>
                      {walletBalance < selectedService.price && <span className="text-[9px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">LOW</span>}
                    </label>
                  )}

                  {/* QR PH */}
                  {pmConfig.xendit && (<>
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${form.paymentMethod === "qrph" ? "border-blue-600 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="spay" value="qrph" checked={form.paymentMethod === "qrph"} onChange={() => setForm({ ...form, paymentMethod: "qrph" })} className="accent-blue-600" />
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1" strokeWidth="2"/><path strokeWidth="2" d="M14 14h2v2h-2zM18 14h3M14 18h2M18 18h3v3M20 16v2"/></svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-gray-800">QR Ph</p>
                      <p className="text-[11px] text-gray-400">Scan QR with any PH banking app</p>
                    </div>
                    <span className="text-[9px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">INSTAPAY</span>
                  </label>

                  {/* E-Wallets */}
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${form.paymentMethod === "ewallet" ? "border-[#00A0E3] bg-sky-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="spay" value="ewallet" checked={form.paymentMethod === "ewallet"} onChange={() => setForm({ ...form, paymentMethod: "ewallet" })} className="accent-[#00A0E3]" />
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

                  {/* Bank Transfer */}
                  <label className={`flex items-center gap-3 border-2 rounded-xl px-4 py-3 cursor-pointer transition-colors ${form.paymentMethod === "bank" ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="radio" name="spay" value="bank" checked={form.paymentMethod === "bank"} onChange={() => setForm({ ...form, paymentMethod: "bank" })} className="accent-green-600" />
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
                  </>)}
                </div>
                {["qrph", "ewallet", "bank", "xendit"].includes(form.paymentMethod) && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 flex items-start gap-2">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[11px] text-blue-700">You&apos;ll be redirected to a secure payment page.</p>
                  </div>
                )}
                {form.paymentMethod === "wallet" && selectedService && walletBalance >= selectedService.price && (
                  <div className="mt-2 bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 flex items-start gap-2">
                    <svg className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <p className="text-[11px] text-purple-700">₱{selectedService.price.toFixed(2)} will be deducted from your Gruwcer Wallet.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50">
              <button onClick={handleBook} disabled={submitting || !form.address || !form.phone || !form.date} className="w-full bg-teal-600 text-white py-3 rounded-lg font-bold text-sm hover:bg-teal-700 disabled:opacity-40">
                {submitting ? "Booking..." : `Confirm Booking — ₱${selectedService.price}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
