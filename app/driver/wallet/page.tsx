"use client"

import { useEffect, useState } from "react"

export default function DriverWalletPage() {
  const [driver, setDriver] = useState<any>(null)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [topUpAmount, setTopUpAmount] = useState(100)
  const [processing, setProcessing] = useState(false)
  const [showTopUp, setShowTopUp] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem("driver_session")
    if (!saved) { window.location.href = "/driver"; return }
    const session = JSON.parse(saved)
    async function load() {
      const all: any[] = await fetch("/api/users?role=driver").then(r => r.json())
      const found = all.find((d) => d.id === session.id)
      if (found) {
        setDriver(found)
        const txns = await fetch(`/api/wallet?ownerId=${found.id}`).then(r => r.json())
        setTransactions(txns)
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleTopUp = async () => {
    if (!driver || topUpAmount < 100) return
    setProcessing(true)
    try {
      const { createXenditPayment } = await import("@/lib/xendit")
      const externalId = `wallet_${driver.id}_${Date.now()}`
      const payment = await createXenditPayment({
        amount: topUpAmount,
        description: `Rider Wallet Top-Up - ₱${topUpAmount}`,
        externalId,
        successRedirectUrl: `${window.location.origin}/driver/wallet`,
        failureRedirectUrl: `${window.location.origin}/driver/wallet`,
      })
      if (payment?.invoiceUrl) {
        window.location.href = payment.invoiceUrl
        return
      }
      alert("Failed to create payment. Please try again.")
    } catch (e) {
      alert("Payment error. Please try again.")
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#319F44] border-t-transparent rounded-full animate-spin" /></div>

  const balance = driver?.walletBalance || 0

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#319F44] text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <a href="/driver" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm">Back</span>
          </a>
          <h1 className="font-bold text-sm">My Wallet</h1>
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-green-600 to-[#59EBC6] rounded-2xl p-6 text-white">
          <p className="text-white/60 text-xs uppercase font-semibold">Wallet Balance</p>
          <p className="text-4xl font-black mt-1">₱{balance.toFixed(2)}</p>
          {balance < 100 && (
            <div className="mt-3 bg-white/20 rounded-lg px-3 py-2">
              <p className="text-xs text-white/90">⚠️ Minimum ₱100 required to accept delivery tasks</p>
            </div>
          )}
          <button onClick={() => setShowTopUp(true)} className="mt-4 bg-white text-[#267a34] px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#319F44]/10 transition-colors">
            + Top Up Wallet
          </button>
        </div>

        {/* How it works */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-2">How Wallet Works</h3>
          <div className="space-y-2 text-xs text-gray-500">
            <p>• You collect <span className="font-bold text-gray-700">COD cash</span> from customers on delivery</p>
            <p>• Platform commission is <span className="font-bold text-gray-700">auto-deducted</span> from your wallet</p>
            <p>• Minimum <span className="font-bold text-gray-700">₱100 balance</span> required to accept tasks</p>
            <p>• Top up anytime with minimum ₱100</p>
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
                    <p className={`text-xs font-medium ${txn.type === "topup" ? "text-[#267a34]" : "text-[#267a34]"}`}>
                      {txn.type === "topup" ? "Wallet Top-Up" : "Commission Deduction"}
                    </p>
                    <p className="text-[10px] text-gray-400">{txn.note || txn.transactionId || ""}</p>
                    <p className="text-[10px] text-gray-300">{txn.createdAt?.toLocaleString?.() || "Just now"}</p>
                  </div>
                  <span className={`text-sm font-bold ${txn.amount >= 0 ? "text-[#319F44]" : "text-green-500"}`}>
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
            <div className="bg-green-600 px-6 py-4">
              <h2 className="font-bold text-lg text-white">Top Up Wallet</h2>
              <p className="text-white/70 text-xs">Minimum ₱100</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Amount (₱)</label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[100, 200, 500].map((amt) => (
                    <button key={amt} onClick={() => setTopUpAmount(amt)} className={`py-2.5 rounded-lg text-sm font-bold border transition-colors ${topUpAmount === amt ? "border-green-600 bg-[#319F44]/10 text-[#267a34]" : "border-gray-200 text-gray-600"}`}>
                      ₱{amt}
                    </button>
                  ))}
                </div>
                <input type="number" min={100} value={topUpAmount} onChange={(e) => setTopUpAmount(Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-3 outline-none focus:border-green-600 text-center text-lg font-bold" />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                <p>Payment via <span className="font-bold">GCash, Maya, QR PH, BPI, BDO, UnionBank, Metrobank, GrabPay</span></p>
              </div>
              <button onClick={handleTopUp} disabled={processing || topUpAmount < 100} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-green-700 disabled:opacity-40">
                {processing ? "Processing..." : `Pay ₱${topUpAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
