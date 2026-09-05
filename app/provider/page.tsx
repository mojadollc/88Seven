"use client"

import { useEffect, useState, useRef } from "react"
// Firebase auth removed

import { useNotificationSound } from "@/app/components/useNotificationSound"


const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const SKILL_OPTIONS = ["Plumbing", "Electrical", "Carpentry", "Painting", "Cleaning", "AC Repair", "Appliance Repair", "Gardening", "Roofing", "Welding", "Tiling", "Masonry"]

interface ServiceItem { id: string; name: string; price: number; unit: string }

function ProfileManagementTab({ provider, onUpdate }: { provider: any; onUpdate: (msg: string) => void }) {
  const [form, setForm] = useState({
    shopName: provider.shopName || "",
    ownerName: provider.ownerName || "",
    phone: provider.phone || "",
    address: provider.address || "",
    openTime: provider.openTime || "08:00",
    closeTime: provider.closeTime || "18:00",
    openDays: provider.openDays || ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    skills: provider.skills || [],
  })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [newSkill, setNewSkill] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleDay = (day: string) => {
    setForm(f => ({ ...f, openDays: f.openDays.includes(day) ? f.openDays.filter((d: string) => d !== day) : [...f.openDays, day] }))
  }

  const addSkill = (skill: string) => {
    if (!skill || form.skills.includes(skill)) return
    setForm(f => ({ ...f, skills: [...f.skills, skill] }))
    setNewSkill("")
  }

  const removeSkill = (skill: string) => {
    setForm(f => ({ ...f, skills: f.skills.filter((s: string) => s !== skill) }))
  }

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append("file", file); fd.append("folder", "providers")
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd })
      const { url } = await uploadRes.json()
      await fetch(`/api/providers/${provider.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logoUrl: url }) })
      onUpdate("Photo uploaded!")
    } catch { onUpdate("Upload failed") }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await fetch(`/api/providers/${provider.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      shopName: form.shopName,
      ownerName: form.ownerName,
      phone: form.phone,
      address: form.address,
      openTime: form.openTime,
      closeTime: form.closeTime,
      openDays: form.openDays,
      skills: form.skills,
    }) })
    setSaving(false)
    onUpdate("Profile updated!")
  }

  return (
    <div className="px-4 pt-4 space-y-4 pb-6">
      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-blue-100">
          {provider.logoUrl ? <img src={provider.logoUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-2xl">{provider.shopName.charAt(0)}</span>}
        </div>
        <div>
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50">
            {uploading ? "Uploading..." : "Upload Photo"}
          </button>
          <p className="text-[10px] text-gray-400 mt-1">JPG/PNG, max 2MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUploadLogo} className="hidden" />
      </div>

      {/* Contact Details */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-bold text-sm text-gray-800">Contact Details</h3>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Business Name</label>
          <input value={form.shopName} onChange={e => setForm(f => ({ ...f, shopName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-blue-600" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Owner Name</label>
          <input value={form.ownerName} onChange={e => setForm(f => ({ ...f, ownerName: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-blue-600" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-blue-600" />
        </div>
      </div>

      {/* Address */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <h3 className="font-bold text-sm text-gray-800 mb-2">Location & Address</h3>
        <textarea value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} rows={2} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600 resize-none" />
      </div>

      {/* Business Hours */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-bold text-sm text-gray-800">Business Hours</h3>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase">Open</label>
            <input type="time" value={form.openTime} onChange={e => setForm(f => ({ ...f, openTime: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-blue-600" />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-semibold text-gray-400 uppercase">Close</label>
            <input type="time" value={form.closeTime} onChange={e => setForm(f => ({ ...f, closeTime: e.target.value }))} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mt-1 outline-none focus:border-blue-600" />
          </div>
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-400 uppercase mb-2 block">Working Days</label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_DAYS.map(day => (
              <button key={day} onClick={() => toggleDay(day)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${form.openDays.includes(day) ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400"}`}>
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h3 className="font-bold text-sm text-gray-800">Skills & Specializations</h3>
        <div className="flex flex-wrap gap-1.5">
          {form.skills.map((skill: string) => (
            <span key={skill} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium">
              {skill}
              <button onClick={() => removeSkill(skill)} className="text-blue-400 hover:text-green-500 ml-0.5">×</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <select value={newSkill} onChange={e => setNewSkill(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-600">
            <option value="">Add skill...</option>
            {SKILL_OPTIONS.filter(s => !form.skills.includes(s)).map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={() => addSkill(newSkill)} disabled={!newSkill} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-40">Add</button>
        </div>
      </div>

      {/* Save */}
      <button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50">
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  )
}

function ServiceManagementTab({ provider, onUpdate }: { provider: any; onUpdate: () => void }) {
  const [services, setServices] = useState<ServiceItem[]>(provider?.services || [])
  const [showAddService, setShowAddService] = useState(false)
  const [serviceForm, setServiceForm] = useState({ name: "", price: 0, unit: "per hour" })
  const [saving, setSaving] = useState(false)

  const addService = () => {
    if (!serviceForm.name || !serviceForm.price) return
    const newService: ServiceItem = { id: Date.now().toString(), name: serviceForm.name, price: serviceForm.price, unit: serviceForm.unit }
    const updated = [...services, newService]
    setServices(updated)
    setServiceForm({ name: "", price: 0, unit: "per hour" })
    setShowAddService(false)
  }

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id))
  }

  const saveServices = async () => {
    if (!provider) return
    setSaving(true)
    await fetch(`/api/providers/${provider.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ services }) })
    setSaving(false)
    onUpdate()
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-sm text-gray-800">Services & Rates</h3>
          <button onClick={() => setShowAddService(true)} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold">+ Add Service</button>
        </div>
        {services.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
            <p className="text-2xl mb-2">🔧</p>
            <p className="text-xs text-gray-400">No services added yet</p>
            <button onClick={() => setShowAddService(true)} className="mt-3 text-xs text-blue-600 font-bold">Add your first service</button>
          </div>
        ) : (
          <div className="space-y-2">
            {services.map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  <p className="text-[10px] text-gray-400">{s.unit}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-blue-600">₱{s.price}</span>
                  <button onClick={() => removeService(s.id)} className="text-green-400 hover:text-[#267a34]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {services.length > 0 && (
          <button onClick={saveServices} disabled={saving} className="w-full mt-4 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold disabled:opacity-50">
            {saving ? "Saving..." : "Save Services"}
          </button>
        )}
      </div>

      {/* Add Service Modal */}
      {showAddService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAddService(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="font-bold text-white">Add Service</h2>
              <p className="text-white/60 text-xs">Set your service and rate</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Service Name</label>
                <input placeholder="e.g. Plumbing Repair" value={serviceForm.name} onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Price (₱)</label>
                <input type="number" min={0} placeholder="500" value={serviceForm.price || ""} onChange={(e) => setServiceForm({ ...serviceForm, price: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Unit</label>
                <select value={serviceForm.unit} onChange={(e) => setServiceForm({ ...serviceForm, unit: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600">
                  <option value="per hour">Per Hour</option>
                  <option value="per service">Per Service</option>
                  <option value="per item">Per Item</option>
                  <option value="flat rate">Flat Rate</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAddService(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={addService} disabled={!serviceForm.name || !serviceForm.price} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">Add Service</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProviderPage() {
  const [user, setUser] = useState<any>(null)
  const [provider, setProvider] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"jobs" | "services" | "wallet" | "profile">("jobs")
  const [isOnline, setIsOnline] = useState(true)
  const [jobs, setJobs] = useState<any[]>([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [successMsg, setSuccessMsg] = useState("")
  const playSound = useNotificationSound()
  const prevJobStatuses = useRef<Record<string, string>>({})

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    if (!u) { setLoading(false); return }
    setUser(u)
    const token = localStorage.getItem("token")
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((p: any) => {
        if (!p) { setLoading(false); return }
        setProvider(p)
        if (p.isOnline !== undefined) setIsOnline(p.isOnline)
        if (p.walletBalance) setWalletBalance(p.walletBalance)
        fetch(`/api/wallet?ownerId=${p.id}`).then(r => r.json()).then(setTransactions)
        setLoading(false)
      })
  }, [])

  // Listen to provider's jobs + notification sound
  useEffect(() => {
    if (!provider) return
    const iv = setInterval(async () => {
      const r = await fetch(`/api/service-jobs?providerId=${provider.id}`)
      if (!r.ok) return
      const newJobs = await r.json()
      let shouldNotify = false
      newJobs.forEach((job: any) => {
        const prev = prevJobStatuses.current[job.id]
        if (!prev && job.status === "pending") shouldNotify = true
        else if (prev && prev !== job.status) { shouldNotify = true; showSuccess(`Job #${job.id.slice(0, 6)} → ${job.status.replace(/_/g, " ")}`) }
      })
      if (shouldNotify && Object.keys(prevJobStatuses.current).length > 0) playSound()
      const newStatuses: Record<string, string> = {}
      newJobs.forEach((j: any) => { newStatuses[j.id] = j.status })
      prevJobStatuses.current = newStatuses
      setJobs(newJobs)
    }, 5000)
    return () => clearInterval(iv)
  }, [provider, playSound])

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(""), 2500)
  }

  const handleToggleOnline = async () => {
    if (!provider) return
    const next = !isOnline
    setIsOnline(next)
    await fetch(`/api/providers/${provider.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isOnline: next }) })
    showSuccess(next ? "You are now ONLINE" : "You are now OFFLINE")
  }

  const handleAcceptJob = async (job: any) => {
    if (!provider) return
    await fetch(`/api/service-jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "accepted", providerId: provider.id }) })
    showSuccess("Job accepted! Check your jobs tab")
  }

  const handleRejectJob = async (jobId: string) => {
    await fetch(`/api/service-jobs/${jobId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) })
    showSuccess("Job declined")
  }

  const handleCompleteJob = async (job: any) => {
    await fetch(`/api/service-jobs/${job.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) })
    // Auto-deduct provider commission from wallet
    if (provider && job.budget) {
      const commission = Math.round((job.budget || 0) * 15 / 100); if (commission > 0) await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: provider.id, ownerType: "provider", type: "commission_deduction", amount: -commission, jobId: job.id, note: "15% platform commission" }) })
    }
    showSuccess("Job marked as completed")
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h2 className="font-bold text-lg text-gray-800 mb-1">Service Provider Login</h2>
        <p className="text-sm text-gray-400 mb-4">Sign in to manage your services</p>
        <a href="/auth?tab=login&redirect=/provider" className="inline-block bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700">Sign In</a>
        <p className="text-xs text-gray-400 mt-3">Not a provider yet? <a href="/auth?tab=provider" className="text-blue-600 font-bold">Register here</a></p>
      </div>
    </div>
  )

  if (!provider) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 text-sm">No provider profile found for this account.</p>
        <a href="/auth?tab=provider" className="inline-block mt-3 text-blue-600 text-sm font-bold">Register as Provider</a>
        <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/auth" }} className="block mx-auto mt-2 text-xs text-gray-400">Logout</button>
      </div>
    </div>
  )

  if (provider.status === "pending") return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
          <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h2 className="font-bold text-xl text-gray-800 mb-2">Application Pending</h2>
          <div className="bg-yellow-50 rounded-xl p-4 text-left mb-4">
            <p className="text-sm text-gray-700"><span className="font-bold">{provider.shopName}</span></p>
            <p className="text-xs text-gray-500 mt-1">{provider.address}</p>
            <p className="text-xs text-gray-500">{provider.phone}</p>
          </div>
          <p className="text-sm text-gray-500 mb-2">Your application is being reviewed by our team.</p>
          <p className="text-xs text-gray-400">Within <span className="font-bold text-gray-600">24 hours</span> you will receive confirmation.</p>
          <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/auth" }} className="mt-5 text-xs text-gray-400 hover:text-gray-600">Logout</button>
        </div>
      </div>
    </main>
  )

  // ACTIVE PROVIDER DASHBOARD
  const pendingCount = jobs.filter(j => j.status === "pending").length
  const activeCount = jobs.filter(j => j.status === "in_progress").length
  const completedCount = jobs.filter(j => j.status === "completed").length

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-600 text-white px-4 py-3 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-xs font-bold">{provider.shopName.charAt(0)}</span>
            </div>
            <div>
              <p className="font-bold text-sm">{provider.shopName}</p>
              <p className="text-[10px] text-white/60">Service Provider</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleToggleOnline} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${isOnline ? "bg-[#319F44]/100" : "bg-[#319F44]/100/80"}`}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-white animate-pulse" : "bg-white/60"}`} />
              {isOnline ? "ONLINE" : "OFFLINE"}
            </button>
            <button onClick={() => { localStorage.removeItem("token"); localStorage.removeItem("user"); window.location.href = "/auth" }} className="text-white/70 hover:text-white text-xs">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto pb-8">
        {/* Stats */}
        {(() => {
          const now = new Date()
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          const weekEarn = transactions.filter(t => t.type === "earning" && t.createdAt && new Date(t.createdAt as any) >= weekAgo).reduce((s, t) => s + t.amount, 0)
          const monthEarn = transactions.filter(t => t.type === "earning" && t.createdAt && new Date(t.createdAt as any) >= monthAgo).reduce((s, t) => s + t.amount, 0)
          return (
            <div className="grid grid-cols-4 gap-2 px-4 py-4">
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-lg font-bold text-yellow-600">{pendingCount}</p>
                <p className="text-[9px] text-gray-400">New Jobs</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-lg font-bold text-[#319F44]">{completedCount}</p>
                <p className="text-[9px] text-gray-400">Completed</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-lg font-bold text-blue-600">₱{weekEarn.toFixed(0)}</p>
                <p className="text-[9px] text-gray-400">This Week</p>
              </div>
              <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <p className="text-lg font-bold text-purple-600">₱{monthEarn.toFixed(0)}</p>
                <p className="text-[9px] text-gray-400">This Month</p>
              </div>
            </div>
          )
        })()}

        {/* Skills Badges */}
        {provider.skills && provider.skills.length > 0 && (
          <div className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {provider.skills.map((skill: string) => (
                <span key={skill} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-[10px] font-semibold">{skill}</span>
              ))}
              <span className="bg-gray-50 text-gray-500 px-2.5 py-1 rounded-full text-[10px] font-semibold">⭐ {provider.rating || "4.8"}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white flex border-b border-gray-200 sticky top-[52px] z-20">
          {(["jobs", "services", "wallet", "profile"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-3 text-xs font-bold relative capitalize ${tab === t ? "text-blue-600" : "text-gray-400"}`}>
              {t === "jobs" ? "🔔 Jobs" : t === "services" ? "🛠️ Services" : t === "wallet" ? "💰 Wallet" : "👤 Profile"}
              {tab === t && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-blue-600 rounded-full" />}
            </button>
          ))}
        </div>

        {/* JOBS TAB */}
        {tab === "jobs" && (
          <div className="px-4 pt-4 space-y-3">
            {jobs.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <p className="text-3xl mb-3">📋</p>
                <p className="text-gray-400 text-sm">No job requests yet</p>
                <p className="text-xs text-gray-300 mt-1">Customers will see you when they search for services</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div key={job.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        job.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                        job.status === "accepted" ? "bg-blue-100 text-blue-800" :
                        job.status === "in_progress" ? "bg-purple-100 text-purple-800" :
                        job.status === "completed" ? "bg-[#59EBC6]/20 text-green-800" :
                        "bg-[#59EBC6]/20 text-green-900"
                      }`}>
                        {job.status}
                      </span>
                      <span className="text-[10px] text-gray-400 font-mono">#{job.id.slice(0, 6)}</span>
                    </div>
                    <span className="text-sm font-bold text-blue-600">₱{job.budget || "TBD"}</span>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-bold text-gray-800">{job.serviceName}</p>
                    <p className="text-xs text-gray-500 mt-1">{job.customerName} • {job.customerPhone}</p>
                    {job.description && <p className="text-xs text-gray-500 bg-blue-50 rounded px-2 py-1 mt-2">📝 {job.description}</p>}
                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      <p>📍 {job.address}</p>
                      <p>📅 {job.scheduledDate} at {job.scheduledTime}</p>
                      <p>⏱️ Est. {job.estimatedDuration}</p>
                    </div>
                    {job.status === "pending" && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                        <button onClick={() => handleRejectJob(job.id)} className="flex-1 border border-green-200 text-[#267a34] py-2.5 rounded-lg text-xs font-bold hover:bg-[#319F44]/10">Decline</button>
                        {isOnline && (
                          <button onClick={() => handleAcceptJob(job)} className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-blue-700">Accept Job</button>
                        )}
                        {!isOnline && (
                          <button disabled className="flex-1 bg-gray-300 text-gray-600 py-2.5 rounded-lg text-xs font-bold">Go Online to Accept</button>
                        )}
                      </div>
                    )}
                    {job.status === "accepted" && <p className="text-xs text-blue-600 font-medium mt-3 pt-3 border-t border-gray-100">✓ Accepted — Ready to start</p>}
                    {job.status === "in_progress" && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button onClick={() => handleCompleteJob(job)} className="w-full bg-green-600 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-700">Mark as Complete</button>
                      </div>
                    )}
                    {job.status === "completed" && <p className="text-xs text-[#319F44] font-medium mt-3 pt-3 border-t border-gray-100">✓ Completed</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* SERVICES TAB */}
        {tab === "services" && (
          <ServiceManagementTab provider={provider} onUpdate={() => showSuccess("Services updated!")} />
        )}

        {/* WALLET TAB */}
        {tab === "wallet" && (() => {
          const earnings = transactions.filter(t => t.type === "earning").reduce((s, t) => s + t.amount, 0)
          const commissions = transactions.filter(t => t.type === "commission").reduce((s, t) => s + Math.abs(t.amount), 0)
          const now = new Date()
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          const weeklyEarnings = transactions.filter(t => t.type === "earning" && t.createdAt && new Date(t.createdAt as any) >= weekAgo).reduce((s, t) => s + t.amount, 0)
          const monthlyEarnings = transactions.filter(t => t.type === "earning" && t.createdAt && new Date(t.createdAt as any) >= monthAgo).reduce((s, t) => s + t.amount, 0)
          return (
            <div className="px-4 pt-4 space-y-4">
              {/* Balance Card */}
              <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl shadow-sm p-6">
                <p className="text-xs text-blue-100 uppercase font-semibold">Wallet Balance</p>
                <p className="text-4xl font-black mt-1">₱{walletBalance.toFixed(2)}</p>
                <a href="/provider/wallet" className="block mt-4 bg-white text-blue-600 py-2.5 rounded-lg text-sm font-bold text-center hover:bg-gray-100">Top Up Wallet</a>
              </div>

              {/* Earnings Breakdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-sm font-bold text-[#319F44]">₱{earnings.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">Total Earned</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-sm font-bold text-green-500">₱{commissions.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">Commission</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-sm font-bold text-blue-600">₱{weeklyEarnings.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">This Week</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                  <p className="text-sm font-bold text-purple-600">₱{monthlyEarnings.toFixed(0)}</p>
                  <p className="text-[10px] text-gray-400">This Month</p>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-800">Recent Transactions</h3>
                  <a href="/provider/wallet" className="text-[10px] text-blue-600 font-bold">View All →</a>
                </div>
                {transactions.length === 0 ? (
                  <p className="p-6 text-center text-xs text-gray-400">No transactions yet</p>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {transactions.slice(0, 5).map((txn) => (
                      <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                          <p className={`text-xs font-semibold ${txn.type === "topup" ? "text-blue-600" : txn.type === "earning" ? "text-[#319F44]" : "text-green-500"}`}>
                            {txn.type === "topup" ? "💳 Top-Up" : txn.type === "earning" ? "💰 Earning" : "📊 Commission"}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{txn.note || ""}</p>
                        </div>
                        <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-[#319F44]" : "text-green-500"}`}>
                          {txn.amount >= 0 ? "+" : ""}₱{Math.abs(txn.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })()}

        {/* PROFILE TAB */}
        {tab === "profile" && (
          <ProfileManagementTab provider={provider} onUpdate={(msg) => { showSuccess(msg); fetch("/api/users/me", { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }).then(r => r.json()).then(p => { if (p) setProvider(p) }) }} />
        )}
      </div>

      {/* Success Toast */}
      {successMsg && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 pointer-events-none">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 max-w-xs w-full text-center pointer-events-auto animate-[fadeIn_0.2s_ease-out]">
            <div className="w-14 h-14 bg-[#59EBC6]/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-7 h-7 text-[#319F44]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="font-bold text-sm text-gray-800">{successMsg}</p>
          </div>
        </div>
      )}
    </main>
  )
}
