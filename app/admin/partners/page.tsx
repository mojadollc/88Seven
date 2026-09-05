"use client"

import { useEffect, useState } from "react"
// All data via Postgres API
import { ResetPasswordModal } from "@/app/admin/components/ResetPasswordModal"

export default function AdminPartnersPage() {
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "inactive">("all")
  const [resetEmail, setResetEmail] = useState<string | null>(null)

  useEffect(() => { loadPartners() }, [])

  const loadPartners = async () => {
    setLoading(true)
    const data = await fetch("/api/users?role=partner").then(r => r.json())
    setPartners(data)
    setLoading(false)
  }

  const handleStatus = async (id: string, status: "pending" | "active" | "inactive") => {
    await fetch(`/api/partners/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) })
    setPartners((prev) => prev.map((p) => p.id === id ? { ...p, status } : p))
  }

  const pending = partners.filter((p) => p.status === "pending")
  const active = partners.filter((p) => p.status === "active")
  const inactive = partners.filter((p) => p.status === "inactive")
  const filtered = filter === "all" ? partners : filter === "pending" ? pending : filter === "active" ? active : inactive

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1F2937]">Partner Management</h1>
          {pending.length > 0 && <span className="bg-[#319F44]/100 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{pending.length} pending</span>}
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">{pending.length}</p>
            <p className="text-xs text-gray-400">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#319F44]">{active.length}</p>
            <p className="text-xs text-gray-400">Active</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-gray-400">{inactive.length}</p>
            <p className="text-xs text-gray-400">Inactive</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#1F2937]">{partners.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["all", "pending", "active", "inactive"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)} className={`px-4 py-2 text-xs rounded-lg capitalize font-medium transition-colors ${filter === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
              {s} {s === "pending" && pending.length > 0 ? `(${pending.length})` : ""}
            </button>
          ))}
        </div>

        {/* Partners List */}
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <p className="text-4xl mb-3">🧺</p>
            <p className="text-gray-400 text-sm">No partners</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((partner) => (
              <div key={partner.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      partner.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      partner.status === "active" ? "bg-[#59EBC6]/20 text-green-800" :
                      "bg-gray-100 text-gray-600"
                    }`}>
                      {partner.status}
                    </span>
                    <span className="text-xs text-gray-400">{partner.createdAt?.toLocaleDateString?.() || ""}</span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /><circle cx="12" cy="14" r="4" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h2m2 0h2" /></svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm text-gray-800">{partner.shopName}</h3>
                        <span className={`w-2 h-2 rounded-full ${partner.isOnline !== false ? "bg-[#319F44]/100" : "bg-gray-400"}`} />
                        <span className="text-[9px] text-gray-400">{partner.isOnline !== false ? "Online" : "Offline"}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-500">
                        <div><span className="text-gray-400">Owner:</span> {partner.name}</div>
                        <div><span className="text-gray-400">Phone:</span> {partner.phone}</div>
                        <div><span className="text-gray-400">Email:</span> {partner.email}</div>
                        <div><span className="text-gray-400">Address:</span> {partner.address}</div>
                        {partner.landmark && <div><span className="text-gray-400">Landmark:</span> {partner.landmark}</div>}
                        {partner.openTime && <div><span className="text-gray-400">Hours:</span> {partner.openTime}–{partner.closeTime}</div>}
                        {partner.openDays && <div className="col-span-2"><span className="text-gray-400">Days:</span> {partner.openDays.join(", ")}</div>}
                      </div>
                    {partner.services && Array.isArray(partner.services) && (partner.services as any[]).length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {(partner.services as any[]).map((s: any) => (
                            <span key={s.id} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{s.name} - ₱{s.price}/{s.unit?.split(" ")[1]}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                    {partner.status === "pending" && (
                      <>
                        <button onClick={() => handleStatus(partner.id, "active")} className="text-xs bg-[#319F44]/100 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600">✓ Approve</button>
                        <button onClick={() => handleStatus(partner.id, "inactive")} className="text-xs border border-green-200 text-[#267a34] px-4 py-2 rounded-lg font-medium hover:bg-[#319F44]/10">✕ Reject</button>
                      </>
                    )}
                    {partner.status === "active" && (
                      <button onClick={() => handleStatus(partner.id, "inactive")} className="text-xs border border-gray-200 text-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50">Deactivate</button>
                    )}
                    {partner.status === "inactive" && (
                      <button onClick={() => handleStatus(partner.id, "active")} className="text-xs bg-[#319F44]/100 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-600">Reactivate</button>
                    )}
                    <button onClick={() => setResetEmail(partner.email)} className="text-xs bg-orange-100 text-orange-700 px-4 py-2 rounded-lg font-medium hover:bg-orange-200">🔑 Reset Password</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {resetEmail && <ResetPasswordModal email={resetEmail} onClose={() => setResetEmail(null)} />}
    </>
  )
}
