"use client"

import { useEffect, useState } from "react"

type AdjustTarget = { id: string; name: string; balance: number; type: "customer" | "partner" }

export default function AdminWalletPage() {
  const [transactions, setTransactions] = useState<any[]>([])
  const [customerTxns, setCustomerTxns] = useState<any[]>([])
  const [partnerTxns, setPartnerTxns] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [customers, setCustomers] = useState<any[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"riders" | "customers" | "partners">("riders")
  const [filter, setFilter] = useState<"all" | "topup" | "deduction">("all")

  // Adjust wallet modal
  const [showAdjust, setShowAdjust] = useState(false)
  const [adjustTarget, setAdjustTarget] = useState<AdjustTarget | null>(null)
  const [adjustAmount, setAdjustAmount] = useState(0)
  const [adjustNote, setAdjustNote] = useState("")
  const [adjusting, setAdjusting] = useState(false)

  useEffect(() => {
    async function load() {
      const [txns, d, c, p] = await Promise.all([
        fetch("/api/wallet").then(r => r.json()),
        fetch("/api/users?role=driver").then(r => r.json()),
        fetch("/api/users?role=customer").then(r => r.json()),
        fetch("/api/users?role=partner").then(r => r.json()),
      ])
      setTransactions(txns)
      setDrivers(d)
      setCustomers(c)
      setPartners(p)
      setLoading(false)
    }
    load()
  }, [])

  const getDriverName = (id: string) => drivers.find((d) => d.id === id)?.name || id.slice(0, 8)
  const getCustomerName = (id: string) => customers.find((c: any) => c.id === id)?.name || id.slice(0, 8)
  const getPartnerName = (id: string) => partners.find((p: any) => p.id === id)?.shopName || id.slice(0, 8)

  const filteredRider = filter === "all" ? transactions : transactions.filter((t) => t.type === filter)
  const filteredCustomer = filter === "all" ? customerTxns : customerTxns.filter((t) => t.type === filter)
  const filteredPartner = filter === "all" ? partnerTxns : partnerTxns.filter((t) => t.type === filter)

  const handleAdjust = async () => {
    if (!adjustTarget || adjustAmount === 0) return
    setAdjusting(true)
    const note = adjustNote || (adjustAmount > 0 ? "Admin top-up" : "Admin deduction")
    if (adjustTarget.type === "customer") {
      await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: adjustTarget.id, ownerType: "customer", type: adjustAmount > 0 ? "topup" : "deduction", amount: adjustAmount, note }) })
      const c = await fetch("/api/users?role=customer").then(r => r.json())
      setCustomers(c)
    } else {
      await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: adjustTarget.id, ownerType: "partner", type: adjustAmount > 0 ? "topup" : "deduction", amount: adjustAmount, note }) })
      const p = await fetch("/api/users?role=partner").then(r => r.json())
      setPartners(p)
    }
    setShowAdjust(false)
    setAdjustTarget(null)
    setAdjustAmount(0)
    setAdjustNote("")
    setAdjusting(false)
  }

  const openAdjust = (target: AdjustTarget) => {
    setAdjustTarget(target)
    setAdjustAmount(0)
    setAdjustNote("")
    setShowAdjust(true)
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <h1 className="text-lg font-bold text-[#1F2937]">Wallet Management</h1>
      </header>

      <div className="p-6">
        {/* Tab Switch */}
        <div className="flex gap-2 mb-6">
          {(["riders", "customers", "partners"] as const).map((t) => (
            <button key={t} onClick={() => { setTab(t); setFilter("all") }} className={`px-5 py-2.5 text-sm rounded-lg font-medium capitalize transition-colors ${tab === t ? "bg-[#319F44] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
              {t === "riders" ? "Rider Wallets" : t === "customers" ? "Customer Wallets" : "Partner Wallets"}
            </button>
          ))}
        </div>

        {/* RIDERS TAB */}
        {tab === "riders" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#319F44]">₱{transactions.filter((t) => t.type === "topup").reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total Top-Ups</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-green-500">₱{transactions.filter((t) => t.type === "deduction").reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total Deductions</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#1F2937]">{transactions.length}</p>
                <p className="text-xs text-gray-400">Transactions</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-800">Rider Wallet Balances</h3>
              </div>
              <div className="divide-y divide-gray-50">
                {drivers.filter((d) => d.status === "active" || (d.status as string) === "pending").map((d) => (
                  <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {d.selfieUrl ? (
                        <img src={d.selfieUrl} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{d.name}</p>
                        <p className="text-[10px] text-gray-400">{d.phone}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${(d.walletBalance || 0) >= 100 ? "text-[#319F44]" : "text-green-500"}`}>
                      ₱{(d.walletBalance || 0).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {(["all", "topup", "deduction"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-xs rounded-lg capitalize font-medium transition-colors ${filter === f ? "bg-[#319F44] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
                  {f === "topup" ? "Top-Ups" : f === "deduction" ? "Deductions" : "All"}
                </button>
              ))}
            </div>

            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : filteredRider.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-gray-400 text-sm">No transactions</p></div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {filteredRider.map((txn) => (
                    <div key={txn.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${txn.type === "topup" ? "bg-[#319F44]/100" : "bg-[#319F44]/100"}`} />
                          <p className="text-sm font-medium text-gray-800">{txn.type === "topup" ? "Top-Up" : "Deduction"}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{getDriverName(txn.driverId || "")}</p>
                        {txn.note && <p className="text-[10px] text-gray-400">{txn.note}</p>}
                        <p className="text-[10px] text-gray-300">{txn.createdAt?.toLocaleString?.() || ""}</p>
                      </div>
                      <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-[#319F44]" : "text-green-500"}`}>
                        {txn.amount >= 0 ? "+" : ""}₱{Math.abs(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CUSTOMERS TAB */}
        {tab === "customers" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#319F44]">₱{customerTxns.filter((t) => t.type === "topup").reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total Top-Ups</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-green-500">₱{customerTxns.filter((t) => t.type === "deduction").reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total Deductions</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#1F2937]">{customerTxns.length}</p>
                <p className="text-xs text-gray-400">Transactions</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-800">All Customers</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {customers.map((c) => (
                  <div key={c.uid} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{c.name}</p>
                      <p className="text-[10px] text-gray-400">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${(c.walletBalance || 0) > 0 ? "text-[#319F44]" : "text-gray-400"}`}>₱{(c.walletBalance || 0).toFixed(0)}</span>
                      <button onClick={() => openAdjust({ id: c.uid, name: c.name, balance: c.walletBalance || 0, type: "customer" })} className="text-[10px] bg-[#319F44] text-white px-2.5 py-1 rounded font-medium hover:bg-[#267a34]">Adjust</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {(["all", "topup", "deduction"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-xs rounded-lg capitalize font-medium transition-colors ${filter === f ? "bg-[#319F44] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
                  {f === "topup" ? "Top-Ups" : f === "deduction" ? "Deductions" : "All"}
                </button>
              ))}
            </div>

            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : filteredCustomer.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-gray-400 text-sm">No transactions</p></div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {filteredCustomer.map((txn) => (
                    <div key={txn.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${txn.type === "topup" ? "bg-[#319F44]/100" : "bg-[#319F44]/100"}`} />
                          <p className="text-sm font-medium text-gray-800">{txn.type === "topup" ? "Top-Up" : "Deduction"}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{getCustomerName(txn.customerId || "")}</p>
                        {txn.note && <p className="text-[10px] text-gray-400">{txn.note}</p>}
                        <p className="text-[10px] text-gray-300">{txn.createdAt?.toLocaleString?.() || ""}</p>
                      </div>
                      <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-[#319F44]" : "text-green-500"}`}>
                        {txn.amount >= 0 ? "+" : ""}₱{Math.abs(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* PARTNERS TAB */}
        {tab === "partners" && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#319F44]">₱{partnerTxns.filter((t) => t.type === "topup").reduce((s, t) => s + t.amount, 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total Top-Ups</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-green-500">₱{partnerTxns.filter((t) => t.type === "deduction").reduce((s, t) => s + Math.abs(t.amount), 0).toLocaleString()}</p>
                <p className="text-xs text-gray-400">Total Deductions</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <p className="text-2xl font-bold text-[#1F2937]">{partnerTxns.length}</p>
                <p className="text-xs text-gray-400">Transactions</p>
              </div>
            </div>

            {/* Partner Balances */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                <h3 className="font-bold text-sm text-gray-800">Partner Wallet Balances</h3>
                <p className="text-[10px] text-gray-400 mt-0.5">Partners need ₱100+ to accept bookings</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-60 overflow-y-auto">
                {partners.filter((p) => p.status === "active").map((p) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.logoUrl ? (
                        <img src={p.logoUrl} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-[10px] font-bold text-blue-600">{p.shopName.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-800">{p.shopName}</p>
                        <p className="text-[10px] text-gray-400">{p.ownerName} • {p.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${(p.walletBalance || 0) >= 100 ? "text-[#319F44]" : "text-green-500"}`}>
                        ₱{(p.walletBalance || 0).toFixed(0)}
                      </span>
                      {(p.walletBalance || 0) < 100 && <span className="text-[9px] bg-[#59EBC6]/20 text-[#267a34] px-1.5 py-0.5 rounded font-bold">BLOCKED</span>}
                      <button onClick={() => openAdjust({ id: p.id, name: p.shopName, balance: p.walletBalance || 0, type: "partner" })} className="text-[10px] bg-[#319F44] text-white px-2.5 py-1 rounded font-medium hover:bg-[#267a34]">Adjust</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              {(["all", "topup", "deduction"] as const).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2 text-xs rounded-lg capitalize font-medium transition-colors ${filter === f ? "bg-[#319F44] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
                  {f === "topup" ? "Top-Ups" : f === "deduction" ? "Deductions" : "All"}
                </button>
              ))}
            </div>

            {loading ? <div className="text-center py-10 text-gray-400">Loading...</div> : filteredPartner.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100"><p className="text-gray-400 text-sm">No partner transactions</p></div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="divide-y divide-gray-50">
                  {filteredPartner.map((txn) => (
                    <div key={txn.id} className="px-5 py-3 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${txn.type === "topup" ? "bg-[#319F44]/100" : "bg-[#319F44]/100"}`} />
                          <p className="text-sm font-medium text-gray-800">{txn.type === "topup" ? "Top-Up" : "Deduction"}</p>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{getPartnerName(txn.partnerId || "")}</p>
                        {txn.note && <p className="text-[10px] text-gray-400">{txn.note}</p>}
                        <p className="text-[10px] text-gray-300">{txn.createdAt?.toLocaleString?.() || ""}</p>
                      </div>
                      <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-[#319F44]" : "text-green-500"}`}>
                        {txn.amount >= 0 ? "+" : ""}₱{Math.abs(txn.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Adjust Wallet Modal */}
      {showAdjust && adjustTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdjust(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-[#1F2937] px-6 py-4">
              <h2 className="font-bold text-lg text-white">Adjust {adjustTarget.type === "partner" ? "Partner" : "Customer"} Wallet</h2>
              <p className="text-white/70 text-xs">{adjustTarget.name} — Current: ₱{adjustTarget.balance.toFixed(0)}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Amount (+ to add, - to deduct)</label>
                <input type="number" value={adjustAmount} onChange={(e) => setAdjustAmount(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-center text-lg font-bold outline-none focus:border-[#319F44] mt-2" placeholder="e.g. 100 or -50" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Note</label>
                <input type="text" value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#319F44] mt-2" placeholder="Reason for adjustment" />
              </div>
              <button onClick={handleAdjust} disabled={adjusting || adjustAmount === 0} className="w-full bg-[#319F44] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#267a34] disabled:opacity-40">
                {adjusting ? "Processing..." : adjustAmount >= 0 ? `Add ₱${adjustAmount}` : `Deduct ₱${Math.abs(adjustAmount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
