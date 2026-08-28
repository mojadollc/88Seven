"use client"

import { useEffect, useState } from "react"
// All data via Postgres API
import { ResetPasswordModal } from "@/app/admin/components/ResetPasswordModal"

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [form, setForm] = useState({ name: "", email: "", phone: "", status: "active" as "active" | "inactive" | "pending" })
  const [resetEmail, setResetEmail] = useState<string | null>(null)

  useEffect(() => { loadDrivers() }, [])

  const loadDrivers = async () => {
    setLoading(true)
    const data = await fetch("/api/users?role=driver").then(r => r.json())
    setDrivers(data)
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ name: "", email: "", phone: "", status: "active" })
    setEditing(null)
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.phone.trim()) return
    if (editing) {
      await fetch(`/api/partners/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) })
    } else {
      await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "register", ...form, role: "driver", password: "Gruwcer2024!" }) })
    }
    resetForm()
    await loadDrivers()
  }

  const handleEdit = (driver: any) => {
    setForm({ name: driver.name, email: driver.email, phone: driver.phone, status: driver.status })
    setEditing(driver)
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this rider?")) return
    await fetch(`/api/partners/${id}`, { method: "DELETE" })
    await loadDrivers()
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1F2937]">Riders / Drivers</h1>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="text-xs bg-[#16A34A] text-white px-4 py-2 rounded-lg font-bold hover:bg-[#15803d] transition-colors"
          >
            + Add Rider
          </button>
        </div>
      </header>

      <div className="p-6 max-w-4xl">
        {/* Add/Edit Form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
            <h3 className="font-bold text-sm mb-4">{editing ? "Edit Rider" : "Add New Rider"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Full Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
              />
              <input
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
              />
              <input
                placeholder="Email (for login)"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
              />
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as "active" | "inactive" })}
                className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#16A34A]"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSubmit} className="bg-[#16A34A] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#15803d]">
                {editing ? "Update" : "Add Rider"}
              </button>
              <button onClick={resetForm} className="bg-gray-100 text-gray-600 px-5 py-2 rounded-lg text-xs font-medium">Cancel</button>
            </div>
          </div>
        )}

        {/* Drivers List */}
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading...</div>
        ) : drivers.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <p className="text-4xl mb-3">🏍️</p>
            <p className="text-gray-400 text-sm">No riders added yet</p>
            <p className="text-xs text-gray-300 mt-1">Add riders to assign them to deliveries</p>
          </div>
        ) : (
          <div className="space-y-3">
            {drivers.map((driver) => (
              <div key={driver.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {driver.selfieUrl ? (
                      <img src={driver.selfieUrl} className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm text-gray-800">{driver.name}</p>
                      <p className="text-xs text-gray-400">{driver.phone} {driver.email && `• ${driver.email}`}</p>
                      {driver.plateNumber && <p className="text-[10px] text-gray-400">{driver.vehicleType} • {driver.plateNumber}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${driver.status === "active" ? "bg-green-100 text-green-700" : (driver.status as string) === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500"}`}>
                      {driver.status}
                    </span>
                    {driver.profileComplete && !(driver as any).profileVerified && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 animate-pulse">Docs Submitted</span>
                    )}
                    <span className={`text-[10px] px-2 py-0.5 rounded-full ${(driver.walletBalance || 0) >= 100 ? "bg-green-50 text-green-600" : "bg-green-50 text-green-500"}`}>
                      ₱{driver.walletBalance || 0}
                    </span>
                  </div>
                </div>

                {/* Documents - show if profile complete but not verified */}
                {driver.profileComplete && !(driver as any).profileVerified && (
                  <div className="px-5 py-3 bg-orange-50 border-t border-orange-100">
                    <p className="text-xs font-bold text-orange-700 mb-2">⚠️ Documents pending verification</p>
                    <div className="flex gap-2 flex-wrap mb-3">
                      {driver.selfieUrl && <a href={driver.selfieUrl} target="_blank" className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded">Selfie</a>}
                      {driver.nbiUrl && <a href={driver.nbiUrl} target="_blank" className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded">NBI/Clearance</a>}
                      {driver.vehicleUrl && <a href={driver.vehicleUrl} target="_blank" className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded">Vehicle Photo</a>}
                    </div>
                    <button onClick={async () => { await fetch(`/api/partners/${driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profileVerified: true }) }); await loadDrivers() }} className="text-xs bg-green-500 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-green-600">✓ Verify & Approve Documents</button>
                  </div>
                )}

                {/* Actions */}
                <div className="px-5 py-3 border-t border-gray-100 flex items-center gap-2">
                  {(driver.status as string) === "pending" && (
                    <button onClick={async () => { await fetch(`/api/partners/${driver.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "active" }) }); await loadDrivers() }} className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold">Approve Rider</button>
                  )}
                  <button onClick={() => handleEdit(driver)} className="text-xs text-blue-600 hover:underline">Edit</button>
                  {driver.email && <button onClick={() => setResetEmail(driver.email)} className="text-xs text-orange-600 hover:underline">🔑 Reset Password</button>}
                  <button onClick={() => handleDelete(driver.id)} className="text-xs text-green-500 hover:underline">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-xs font-bold text-blue-700 mb-1">💡 Rider Login Credentials</p>
          <p className="text-xs text-blue-600">
            Riders log in at <span className="font-mono font-bold">/driver</span> using their email and the password you provide them.
            The rider ID used for order assignment is their Firestore document ID shown below their name.
          </p>
        </div>
      </div>

      {resetEmail && <ResetPasswordModal email={resetEmail} onClose={() => setResetEmail(null)} />}
    </>
  )
}
