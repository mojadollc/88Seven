"use client"

import { useEffect, useState } from "react"
import { getFirestore, collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore"

const db = getFirestore()

type PlatformPromo = {
  id: string
  title: string
  description: string
  discountPercent: number
  minOrder: number
  validUntil: string
  applicableTo: string // "all" | "laundry" | "grocery" | "services"
  active: boolean
  createdAt: any
}

export default function AdminPromosPage() {
  const [promos, setPromos] = useState<PlatformPromo[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", promoCode: "", discountPercent: 10, minOrder: 0, validUntil: "", applicableTo: "all" })

  useEffect(() => {
    const q = query(collection(db, "platformPromos"))
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PlatformPromo)
      data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      setPromos(data)
    }, () => {})
    return () => unsub()
  }, [])

  const handleCreate = async () => {
    if (!form.title || !form.discountPercent) return
    await addDoc(collection(db, "platformPromos"), { ...form, active: true, createdAt: serverTimestamp() })
    setForm({ title: "", description: "", promoCode: "", discountPercent: 10, minOrder: 0, validUntil: "", applicableTo: "all" })
    setShowForm(false)
  }

  const togglePromo = async (id: string, active: boolean) => {
    await updateDoc(doc(db, "platformPromos", id), { active })
  }

  const removePromo = async (id: string) => {
    await deleteDoc(doc(db, "platformPromos", id))
  }

  const LABELS: Record<string, string> = { all: "All Services", laundry: "Laundry", grocery: "Grocery", services: "Home Services" }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-[#1a1a2e]">Platform Promos</h1>
          <p className="text-xs text-gray-400">Global promotions visible to all users across services</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-[#D62828] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#b71c1c]">+ New Promo</button>
      </header>

      <div className="p-6 max-w-4xl">
        {promos.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <p className="text-2xl mb-2">🏷️</p>
            <p className="text-gray-400 text-sm">No platform promos yet</p>
            <p className="text-xs text-gray-300 mt-1">Create promos that apply to all laundry shops, grocery, or all services</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promos.map((promo) => (
              <div key={promo.id} className={`bg-white rounded-xl border shadow-sm p-5 ${promo.active ? "border-green-200" : "border-gray-200 opacity-60"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{promo.title}</span>
                      <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">{promo.discountPercent}% OFF</span>
                      <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{LABELS[promo.applicableTo] || "All"}</span>
                    </div>
                    {(promo as any).promoCode && (
                      <div className="mt-1.5 inline-flex items-center gap-1.5 bg-gray-50 border border-dashed border-gray-300 rounded-md px-2 py-1">
                        <span className="text-[10px] text-gray-400">CODE:</span>
                        <span className="text-xs font-bold text-gray-700 tracking-wide">{(promo as any).promoCode}</span>
                      </div>
                    )}
                    {promo.description && <p className="text-sm text-gray-500 mt-1">{promo.description}</p>}
                    <div className="flex gap-4 mt-2 text-xs text-gray-400">
                      {promo.minOrder > 0 && <span>Min. ₱{promo.minOrder}</span>}
                      {promo.validUntil && <span>Until {promo.validUntil}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => togglePromo(promo.id, !promo.active)} className={`w-12 h-6 rounded-full relative transition-colors ${promo.active ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${promo.active ? "translate-x-6" : ""}`} />
                    </button>
                    <button onClick={() => removePromo(promo.id)} className="text-red-400 hover:text-red-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#D62828] px-6 py-4">
              <h2 className="font-bold text-white">Create Platform Promo</h2>
              <p className="text-white/60 text-xs">This promo applies across selected services for all users</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Promo Title</label>
                <input placeholder="e.g. Weekend Special 15% OFF" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-[#D62828]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Promo Code</label>
                <input placeholder="e.g. WEEKEND15" value={form.promoCode} onChange={(e) => setForm({ ...form, promoCode: e.target.value.toUpperCase().replace(/\s/g, "") })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-[#D62828] uppercase tracking-wide" />
                <p className="text-[10px] text-gray-400 mt-1">Users enter this code at checkout to apply discount</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                <input placeholder="e.g. Valid on all laundry orders this weekend" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-[#D62828]" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Applicable To</label>
                <select value={form.applicableTo} onChange={(e) => setForm({ ...form, applicableTo: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-[#D62828]">
                  <option value="all">All Services</option>
                  <option value="laundry">Laundry Only</option>
                  <option value="grocery">Grocery Only</option>
                  <option value="services">Home Services Only</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Discount %</label>
                  <input type="number" min={1} max={100} value={form.discountPercent || ""} onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-[#D62828]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Min Order (₱)</label>
                  <input type="number" min={0} value={form.minOrder || ""} onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-[#D62828]" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Valid Until (optional)</label>
                <input type="date" value={form.validUntil} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-[#D62828]" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleCreate} disabled={!form.title || !form.discountPercent} className="flex-1 bg-[#D62828] text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">Create Promo</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
