"use client"

import { useEffect, useState } from "react"
import { getUser, getToken } from "@/lib/auth"


export default function CustomerWalletPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTopUp, setShowTopUp] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState(100)
  const [processing, setProcessing] = useState(false)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    const u = getUser()
    if (!u) { setLoading(false); return }
    setUser(u)
    const token = getToken()
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(p => { if (p) { setProfile(p); setBalance(p.walletBalance || 0) } })
    fetch(`/api/wallet?ownerId=${u.id}`)
      .then(r => r.ok ? r.json() : [])
      .then(setTransactions)
    setLoading(false)
  }, [])

  const handleTopUp = async () => {
    if (!user || topUpAmount < 100) return
    setProcessing(true)
    try {
      const { createXenditPayment } = await import("@/lib/xendit")
      const payment = await createXenditPayment({
        amount: topUpAmount,
        description: `Customer Wallet Top-Up - ₱${topUpAmount}`,
        externalId: `customer_wallet_${user.uid}_${Date.now()}`,
        successRedirectUrl: `${window.location.origin}/account/wallet`,
        failureRedirectUrl: `${window.location.origin}/account/wallet`,
      })
      if (payment?.invoiceUrl) {
        window.location.href = payment.invoiceUrl
        return
      }
      alert("Failed to create payment.")
    } catch { alert("Payment error.") }
    finally { setProcessing(false) }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#4194AF] border-t-transparent rounded-full animate-spin" /></div>

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Please sign in first.</p>
        <a href="/auth?redirect=/account/wallet" className="text-[#4194AF] text-sm font-bold mt-2 inline-block">Sign In</a>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#4194AF] text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href="/account" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm">Back</span>
          </a>
          <h1 className="font-bold text-sm">My Wallet</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-[#4194AF] to-[#3a7d96] rounded-2xl p-6 text-white">
          <p className="text-white/60 text-xs uppercase font-semibold">Wallet Balance</p>
          <p className="text-4xl font-black mt-1">₱{balance.toFixed(2)}</p>
          <p className="text-white/50 text-[10px] mt-1">Use wallet balance to pay for orders</p>
          <button onClick={() => setShowTopUp(true)} className="mt-4 bg-white text-[#4194AF] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#4194AF]/10 transition-colors">
            + Top Up Wallet
          </button>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-2">How Wallet Works</h3>
          <div className="space-y-2 text-xs text-gray-500">
            <p>• Top up your wallet and use it to <span className="font-bold text-gray-700">pay for orders</span></p>
            <p>• Enjoy <span className="font-bold text-gray-700">faster checkout</span> with wallet balance</p>
            <p>• Minimum top-up is <span className="font-bold text-gray-700">₱100</span></p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-sm text-gray-800">Transaction History</h3>
          </div>
          {transactions.length === 0 ? (
            <p className="p-4 text-center text-xs text-gray-400">No transactions yet</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {transactions.map((txn) => (
                <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${txn.type === "topup" ? "text-[#3a7d96]" : "text-[#3a7d96]"}`}>
                      {txn.type === "topup" ? "Wallet Top-Up" : "Payment Deduction"}
                    </p>
                    {txn.note && <p className="text-[10px] text-gray-400">{txn.note}</p>}
                    <p className="text-[10px] text-gray-300">{txn.createdAt?.toLocaleString?.() || "Just now"}</p>
                  </div>
                  <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-[#4194AF]" : "text-green-500"}`}>
                    {txn.amount >= 0 ? "+" : ""}₱{Math.abs(txn.amount)}
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
            <div className="bg-[#4194AF] px-6 py-4">
              <h2 className="font-bold text-lg text-white">Top Up Wallet</h2>
              <p className="text-white/70 text-xs">Minimum ₱100</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[100, 200, 500].map((amt) => (
                  <button key={amt} onClick={() => setTopUpAmount(amt)} className={`py-2.5 rounded-lg text-sm font-bold border transition-colors ${topUpAmount === amt ? "border-[#4194AF] bg-[#4194AF]/10 text-[#4194AF]" : "border-gray-200 text-gray-600"}`}>
                    ₱{amt}
                  </button>
                ))}
              </div>
              <input type="number" min={100} value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-center text-lg font-bold outline-none focus:border-[#4194AF]" />
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                <p>Payment via <span className="font-bold">GCash, Maya, QR PH, BPI, BDO, UnionBank, Metrobank, GrabPay</span></p>
              </div>
              <button onClick={handleTopUp} disabled={processing || topUpAmount < 100} className="w-full bg-[#4194AF] text-white py-3 rounded-xl font-bold text-sm hover:bg-[#3a7d96] disabled:opacity-40">
                {processing ? "Processing..." : `Pay ₱${topUpAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
