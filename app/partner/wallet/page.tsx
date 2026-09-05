"use client"

import { useEffect, useState } from "react"
import { getUser, getToken } from "@/lib/auth"
import type { User } from "firebase/auth"


export default function PartnerWalletPage() {
  const [user, setUser] = useState<any>(null)
  const [partner, setPartner] = useState<any>(null)
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showTopUp, setShowTopUp] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [topUpAmount, setTopUpAmount] = useState(500)
  const [withdrawAmount, setWithdrawAmount] = useState(0)
  const [processing, setProcessing] = useState(false)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    const u = getUser()
    if (!u) { setLoading(false); return }
    setUser(u)
    const token = getToken()
    fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(p => {
        if (p) {
          setPartner(p)
          setBalance(p.walletBalance || 0)
          fetch(`/api/wallet?ownerId=${p.id}`).then(r => r.json()).then(setEntries)
        }
        setLoading(false)
      })
  }, [])

  const handleTopUp = async () => {
    if (!partner || topUpAmount < 100) return
    setProcessing(true)
    try {
      const { createXenditPayment } = await import("@/lib/xendit")
      const payment = await createXenditPayment({
        amount: topUpAmount,
        description: `Partner Wallet Top-Up - ₱${topUpAmount}`,
        externalId: `partner_wallet_${partner.id}_${Date.now()}`,
        successRedirectUrl: `${window.location.origin}/partner/wallet`,
        failureRedirectUrl: `${window.location.origin}/partner/wallet`,
      })
      if (payment?.invoiceUrl) {
        window.location.href = payment.invoiceUrl
        return
      }
      alert("Failed to create payment.")
    } catch { alert("Payment error.") }
    finally { setProcessing(false) }
  }

  const handleWithdraw = async () => {
    if (!partner || withdrawAmount < 100 || withdrawAmount > balance) return
    setProcessing(true)
    await fetch("/api/wallet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ownerId: partner.id, ownerType: "partner", type: "deduction", amount: -withdrawAmount, note: "Wallet withdrawal" }) })
    setBalance(b => b - withdrawAmount)
    setShowWithdraw(false)
    setWithdrawAmount(0)
    setProcessing(false)
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>

  if (!user || !partner) return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <p className="text-gray-500 text-sm">Please login as a partner first.</p>
        <a href="/auth?tab=login&redirect=/partner/wallet" className="text-blue-600 text-sm font-bold mt-2 inline-block">Sign In</a>
      </div>
    </div>
  )

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-blue-600 text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href="/partner" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm">Back</span>
          </a>
          <h1 className="font-bold text-sm">Partner Wallet</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
          <p className="text-white/60 text-xs uppercase font-semibold">Wallet Balance</p>
          <p className="text-4xl font-black mt-1">₱{balance.toFixed(2)}</p>
          <p className="text-white/50 text-[10px] mt-1">Minimum ₱100 required to accept bookings</p>
          {balance < 100 && (
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2">
              <p className="text-xs text-white/90">⚠️ You cannot accept bookings until balance is ₱100+</p>
            </div>
          )}
          <div className="flex gap-3 mt-4">
            <button onClick={() => setShowTopUp(true)} className="flex-1 bg-white text-blue-700 py-2.5 rounded-xl text-sm font-bold">+ Top Up</button>
            <button onClick={() => { setWithdrawAmount(Math.min(balance, 500)); setShowWithdraw(true) }} disabled={balance < 100} className="flex-1 bg-white/20 text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40">Withdraw</button>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-2">How Partner Wallet Works</h3>
          <div className="space-y-2 text-xs text-gray-500">
            <p>• Your earnings from completed laundry orders are credited here</p>
            <p>• Platform commission is <span className="font-bold text-gray-700">auto-deducted</span> per order</p>
            <p>• Withdraw your balance anytime (min ₱100)</p>
            <p>• Top up if you need to pay for platform fees</p>
          </div>
        </div>

        {/* Payment Methods Info */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-2">Payment Methods</h3>
          <div className="grid grid-cols-4 gap-2">
            {["GCash", "Maya", "QR PH", "BPI", "BDO", "UnionBank", "Metrobank", "GrabPay"].map((m) => (
              <div key={m} className="text-center bg-gray-50 rounded-lg py-2 px-1">
                <p className="text-[9px] font-medium text-gray-600">{m}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-sm text-gray-800">Transaction History</h3>
          </div>
          {entries.length === 0 ? (
            <p className="p-4 text-center text-xs text-gray-400">No transactions yet</p>
          ) : (
            <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
              {entries.map((txn) => (
                <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className={`text-xs font-medium ${txn.type === "topup" ? "text-[#3a7d96]" : "text-[#3a7d96]"}`}>
                      {txn.type === "topup" ? "Wallet Top-Up" : "Deduction"}
                    </p>
                    <p className="text-[10px] text-gray-400">{txn.note}</p>
                    <p className="text-[10px] text-gray-300">{txn.createdAt?.toLocaleString?.() || ""}</p>
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
            <div className="bg-blue-600 px-6 py-4">
              <h2 className="font-bold text-lg text-white">Top Up Wallet</h2>
              <p className="text-white/70 text-xs">GCash, Maya, QR PH, Bank Transfer & more</p>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[200, 500, 1000].map((amt) => (
                  <button key={amt} onClick={() => setTopUpAmount(amt)} className={`py-2.5 rounded-lg text-sm font-bold border ${topUpAmount === amt ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-600"}`}>₱{amt}</button>
                ))}
              </div>
              <input type="number" min={100} value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-center text-lg font-bold outline-none focus:border-blue-600" />
              <button onClick={handleTopUp} disabled={processing || topUpAmount < 100} className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40">
                {processing ? "Processing..." : `Pay ₱${topUpAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdraw && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowWithdraw(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-green-600 px-6 py-4">
              <h2 className="font-bold text-lg text-white">Withdraw</h2>
              <p className="text-white/70 text-xs">Available: ₱{balance.toFixed(2)}</p>
            </div>
            <div className="p-6 space-y-4">
              <input type="number" min={100} max={balance} value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-center text-lg font-bold outline-none focus:border-green-600" />
              <p className="text-[10px] text-gray-400 text-center">Withdrawal will be processed to your registered payment method</p>
              <button onClick={handleWithdraw} disabled={processing || withdrawAmount < 100 || withdrawAmount > balance} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm disabled:opacity-40">
                {processing ? "Processing..." : `Withdraw ₱${withdrawAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
