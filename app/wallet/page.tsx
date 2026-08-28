"use client"

import { useEffect, useState } from "react"
import type { User } from "firebase/auth"

export default function WalletPage() {
  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState("")
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null
    if (!u) { setLoading(false); return }
    setUser(u)
    const token = localStorage.getItem("token")
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(p => { if (p) setBalance(p.walletBalance || 0) })
    fetch(`/api/wallet?ownerId=${u.id}`).then(r => r.json()).then(setTransactions)
    setLoading(false)
  }, [])

  const handleTopUp = async () => {
    const amount = parseFloat(topUpAmount)
    if (!amount || amount < 50 || !user) return
    setProcessing(true)
    try {
      const { createXenditPayment } = await import("@/lib/xendit")
      const payment = await createXenditPayment({
        amount,
        description: `Payroo Wallet Top-up`,
        externalId: `wallet_topup_${user.id}_${Date.now()}`,
        paymentMethods: ["GRABPAY", "MAYA", "SHOPEEPAY", "QRPH", "DD_BPI", "DD_UBP"],
        successRedirectUrl: `${window.location.origin}/wallet?topup=success&amount=${amount}`,
        failureRedirectUrl: `${window.location.origin}/wallet?topup=failed`,
      })
      if (payment?.invoiceUrl) window.location.href = payment.invoiceUrl
    } catch { alert("Failed to initiate top-up. Please try again.") }
    finally { setProcessing(false) }
  }

  // Handle top-up success callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("topup") === "success" && user) {
      const amount = parseFloat(params.get("amount") || "0")
      if (amount > 0) {
        fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: user.id, ownerType: "customer", type: "topup", amount, note: "Wallet top-up" }) })
          .then(() => {
            setBalance(b => b + amount)
            fetch(`/api/wallet?ownerId=${user.id}`).then(r => r.json()).then(setTransactions)
            window.history.replaceState({}, "", "/wallet")
          })
      }
    }
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-3 border-[#7C3AED] border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[#7C3AED]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
        </div>
        <h1 className="text-lg font-bold text-gray-800">Payroo Wallet</h1>
        <p className="text-sm text-gray-400 mt-1 mb-4">Sign in to access your wallet</p>
        <a href="/auth?redirect=/wallet" className="bg-[#7C3AED] text-white px-6 py-2.5 rounded-lg text-sm font-bold">Sign In</a>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] pb-24">
      {/* Header */}
      <header className="bg-[#7C3AED] px-4 pt-12 pb-8">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-6">
            <a href="/account" className="text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </a>
            <h1 className="text-white font-bold text-lg">Payroo Wallet</h1>
            <div className="w-6" />
          </div>

          {/* Balance Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center">
            <p className="text-white/70 text-xs uppercase tracking-wider">Available Balance</p>
            <p className="text-white text-4xl font-black mt-1">₱{balance.toFixed(2)}</p>
            <button
              onClick={() => setShowTopUp(true)}
              className="mt-4 bg-white text-[#7C3AED] font-bold px-6 py-2.5 rounded-full text-sm hover:bg-gray-100 transition-colors shadow-lg"
            >
              + Top Up
            </button>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="max-w-lg mx-auto px-4 -mt-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 grid grid-cols-3 gap-3">
          <button onClick={() => setShowTopUp(true)} className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            </div>
            <span className="text-[10px] font-medium text-gray-600">Top Up</span>
          </button>
          <a href="/grocery" className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            </div>
            <span className="text-[10px] font-medium text-gray-600">Shop</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-1.5">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <span className="text-[10px] font-medium text-gray-600">Orders</span>
          </a>
        </div>
      </div>

      {/* Transactions */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <h2 className="font-bold text-sm text-gray-800 mb-3">Transaction History</h2>
        {transactions.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-gray-400 text-sm">No transactions yet</p>
            <p className="text-gray-300 text-xs mt-1">Top up your wallet to get started</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
            {transactions.map((txn) => (
              <div key={txn.id} className="px-4 py-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${txn.amount >= 0 ? "bg-green-100" : "bg-green-100"}`}>
                  {txn.amount >= 0 ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  ) : (
                    <svg className="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{txn.note || (txn.amount >= 0 ? "Top-up" : "Payment")}</p>
                  <p className="text-[10px] text-gray-400">{txn.createdAt ? new Date(txn.createdAt as any).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</p>
                </div>
                <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-green-600" : "text-green-700"}`}>
                  {txn.amount >= 0 ? "+" : ""}₱{Math.abs(txn.amount).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Up Modal */}
      {showTopUp && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowTopUp(false)} />
          <div className="relative bg-white rounded-t-2xl md:rounded-2xl w-full max-w-sm mx-auto overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-base text-gray-800">Top Up Wallet</h2>
              <button onClick={() => setShowTopUp(false)} className="text-gray-400 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-2 block">Select Amount</label>
                <div className="grid grid-cols-3 gap-2">
                  {[100, 200, 500, 1000, 2000, 5000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setTopUpAmount(String(amt))}
                      className={`py-2.5 rounded-lg text-sm font-bold border transition-colors ${topUpAmount === String(amt) ? "bg-[#7C3AED] text-white border-[#7C3AED]" : "bg-white text-gray-700 border-gray-200 hover:border-[#7C3AED]"}`}
                    >
                      ₱{amt}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">Or enter custom amount</label>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:border-[#7C3AED]">
                  <span className="px-3 text-gray-400 text-sm">₱</span>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="0.00"
                    min="50"
                    className="flex-1 py-2.5 pr-3 text-sm outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Minimum top-up: ₱50</p>
              </div>
              <button
                onClick={handleTopUp}
                disabled={processing || !topUpAmount || parseFloat(topUpAmount) < 50}
                className="w-full bg-[#7C3AED] text-white py-3 rounded-lg font-bold text-sm disabled:opacity-40 hover:bg-[#6D28D9] transition-colors"
              >
                {processing ? "Processing..." : `Top Up ₱${topUpAmount || "0"}`}
              </button>
              <p className="text-[10px] text-center text-gray-400">You'll be redirected to a secure payment page</p>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <div className="max-w-lg mx-auto grid grid-cols-4 py-1.5">
          <a href="/" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[10px] font-medium">Home</span>
          </a>
          <a href="/grocery" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <span className="text-[10px] font-medium">Grocery</span>
          </a>
          <a href="/wallet" className="flex flex-col items-center gap-0.5 py-1 text-[#7C3AED]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
            <span className="text-[10px] font-bold">Wallet</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-medium">Account</span>
          </a>
        </div>
      </nav>
    </div>
  )
}
