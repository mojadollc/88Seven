"use client"

import { useEffect, useState } from "react"

export default function ProviderWalletPage() {
  const [provider, setProvider] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [topUpAmount, setTopUpAmount] = useState(200)
  const [showTopUp, setShowTopUp] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    if (!u) { window.location.href = "/auth?redirect=/provider/wallet"; return }
    const token = localStorage.getItem("token")
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (!p) { window.location.href = "/provider"; return }
        setProvider(p)
        fetch(`/api/wallet?ownerId=${p.id}`).then(r => r.json()).then(setTransactions)
        setLoading(false)
      })
  }, [])

  const handleTopUp = async () => {
    if (!provider || topUpAmount < 100) return
    setProcessing(true)
    try {
      const { createXenditPayment } = await import("@/lib/xendit")
      const externalId = `provider_wallet_${provider.id}_${Date.now()}`
      const payment = await createXenditPayment({
        amount: topUpAmount,
        description: `Provider Wallet Top-Up - ₱${topUpAmount}`,
        externalId,
        successRedirectUrl: `${window.location.origin}/provider/wallet?success=1`,
        failureRedirectUrl: `${window.location.origin}/provider/wallet`,
      })
      if (payment?.invoiceUrl) { window.location.href = payment.invoiceUrl; return }
      alert("Failed to create payment. Please try again.")
    } catch {
      alert("Payment error. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  const balance = provider?.walletBalance || 0
  const earnings = transactions.filter(t => t.type === "earning").reduce((s, t) => s + t.amount, 0)
  const commissions = transactions.filter(t => t.type === "commission").reduce((s, t) => s + Math.abs(t.amount), 0)
  const topUps = transactions.filter(t => t.type === "topup").reduce((s, t) => s + t.amount, 0)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href="/provider" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm">Back</span>
          </a>
          <h1 className="font-bold text-sm">My Wallet</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
          <p className="text-white/60 text-xs uppercase font-semibold">Wallet Balance</p>
          <p className="text-4xl font-black mt-1">₱{balance.toFixed(2)}</p>
          <button onClick={() => setShowTopUp(true)} className="mt-4 bg-white text-blue-700 px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-50">
            + Top Up Wallet
          </button>
        </div>

        {/* Earnings Summary */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-sm font-bold text-[#4194AF]">₱{earnings.toFixed(0)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Total Earned</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-sm font-bold text-green-500">₱{commissions.toFixed(0)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Commission</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
            <p className="text-sm font-bold text-blue-600">₱{topUps.toFixed(0)}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Top-Ups</p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-sm text-gray-800">Transaction History</h3>
          </div>
          {transactions.length === 0 ? (
            <p className="p-8 text-center text-xs text-gray-400">No transactions yet</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {transactions.map((txn) => (
                <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-semibold ${txn.type === "topup" ? "text-blue-600" : txn.type === "earning" ? "text-[#4194AF]" : txn.type === "commission" ? "text-green-500" : "text-gray-600"}`}>
                      {txn.type === "topup" ? "💳 Top-Up" : txn.type === "earning" ? "💰 Earning" : txn.type === "commission" ? "📊 Commission" : "📤 Deduction"}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{txn.note || ""}</p>
                    <p className="text-[10px] text-gray-300">{txn.createdAt?.toLocaleDateString?.() || "Recently"}</p>
                  </div>
                  <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-[#4194AF]" : "text-green-500"}`}>
                    {txn.amount >= 0 ? "+" : ""}₱{Math.abs(txn.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top-Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTopUp(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="font-bold text-lg text-white">Top Up Wallet</h2>
              <p className="text-white/70 text-xs">Minimum ₱100</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Amount (₱)</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[100, 200, 500].map((amt) => (
                    <button key={amt} onClick={() => setTopUpAmount(amt)} className={`py-2.5 rounded-lg text-sm font-bold border ${topUpAmount === amt ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>
                      ₱{amt}
                    </button>
                  ))}
                </div>
                <input type="number" min={100} value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-3 outline-none focus:border-blue-600 text-center text-lg font-bold" />
              </div>
              <p className="text-[11px] text-gray-400 text-center">Pay via GCash, Maya, QR PH, BPI, BDO & more</p>
              <button onClick={handleTopUp} disabled={processing || topUpAmount < 100} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-40">
                {processing ? "Processing..." : `Pay ₱${topUpAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
