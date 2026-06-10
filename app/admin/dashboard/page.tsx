"use client"

import { useEffect, useState } from "react"
import { getDeliverySettings, type Order, type DeliverySettings } from "@/lib/firebase"
import { getFirestore, collection, query, orderBy, onSnapshot } from "firebase/firestore"

const db = getFirestore()

type LaundryOrder = {
  id: string
  totalPrice: number
  price: number
  pickupFee: number
  deliveryFee: number
  status: string
  createdAt: any
}

type WalletEntry = {
  id: string
  ownerType: "rider" | "partner"
  amount: number
  type: string
  createdAt: any
}

export default function AdminDashboardPage() {
  const [groceryOrders, setGroceryOrders] = useState<Order[]>([])
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>([])
  const [settings, setSettings] = useState<DeliverySettings | null>(null)
  const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<"today" | "week" | "month" | "all">("today")

  useEffect(() => {
    getDeliverySettings().then(setSettings)

    const unsub1 = onSnapshot(query(collection(db, "orders"), orderBy("createdAt", "desc")), (snap) => {
      setGroceryOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Order))
    }, () => {})

    const unsub2 = onSnapshot(query(collection(db, "laundryOrders"), orderBy("createdAt", "desc")), (snap) => {
      setLaundryOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LaundryOrder))
    }, () => {})

    const unsub3 = onSnapshot(query(collection(db, "wallet"), orderBy("createdAt", "desc")), (snap) => {
      setWalletEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as WalletEntry))
      setLoading(false)
    }, () => setLoading(false))

    return () => { unsub1(); unsub2(); unsub3() }
  }, [])

  // Period filter
  const getStartDate = () => {
    const now = new Date()
    if (period === "today") { now.setHours(0, 0, 0, 0); return now }
    if (period === "week") { now.setDate(now.getDate() - 7); return now }
    if (period === "month") { now.setMonth(now.getMonth() - 1); return now }
    return new Date(0)
  }

  const startDate = getStartDate()
  const filterByDate = (createdAt: any) => {
    if (period === "all") return true
    const d = createdAt?.toDate?.()
    return d && d >= startDate
  }

  // Filtered data
  const gDelivered = groceryOrders.filter((o) => o.status === "delivered" && filterByDate(o.createdAt))
  const lDelivered = laundryOrders.filter((o) => o.status === "delivered" && filterByDate(o.createdAt))

  const riderPercent = settings?.riderCommissionPercent || 20
  const partnerPercent = settings?.partnerCommissionPercent || 15

  // Grocery earnings - products are from POS store, platform only earns from delivery fee commission
  const groceryRevenue = gDelivered.reduce((s, o) => s + o.total, 0)
  const groceryBaseFare = settings?.grocery?.baseFare || 39
  const groceryDeliveryFees = gDelivered.length * groceryBaseFare
  const groceryRiderCommission = Math.round(groceryDeliveryFees * riderPercent / 100)
  // Platform profit from grocery = only the commission % kept from delivery fees
  const groceryPlatformProfit = groceryRiderCommission

  // Laundry earnings
  const laundryRevenue = lDelivered.reduce((s, o) => s + (o.totalPrice || 0), 0)
  const laundryServiceFees = lDelivered.reduce((s, o) => s + (o.price || 0), 0)
  const laundryDeliveryFees = lDelivered.reduce((s, o) => s + (o.pickupFee || 0) + (o.deliveryFee || 0), 0)
  const laundryPartnerCommission = Math.round(laundryServiceFees * partnerPercent / 100)
  const laundryRiderCommission = Math.round(laundryDeliveryFees * riderPercent / 100)
  const laundryPlatformProfit = laundryPartnerCommission + laundryRiderCommission

  // Platform totals
  const totalPlatformIncome = groceryPlatformProfit + laundryPlatformProfit
  const totalDeliveries = gDelivered.length + lDelivered.length
  const totalRiderCommission = groceryRiderCommission + laundryRiderCommission
  const totalPartnerCommission = laundryPartnerCommission

  if (loading) return <div className="p-10 text-center text-gray-400">Loading dashboard...</div>

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1a1a2e]">Dashboard</h1>
          <div className="flex gap-1">
            {(["today", "week", "month", "all"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className={`px-3 py-1.5 text-[10px] rounded-lg font-bold capitalize transition-colors ${period === p ? "bg-[#D62828] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                {p === "all" ? "All Time" : p}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Platform Income Summary */}
        <div className="bg-gradient-to-r from-[#D62828] to-[#a11d1d] rounded-2xl p-6 text-white mb-6">
          <p className="text-white/60 text-xs uppercase font-semibold">Platform Income ({period === "all" ? "All Time" : period})</p>
          <p className="text-4xl font-black mt-1">₱{totalPlatformIncome.toLocaleString()}</p>
          <div className="grid grid-cols-4 gap-3 mt-4">
            <div>
              <p className="text-white/50 text-[10px]">Deliveries</p>
              <p className="text-lg font-bold">{totalDeliveries}</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px]">Grocery</p>
              <p className="text-lg font-bold">₱{groceryPlatformProfit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px]">Laundry</p>
              <p className="text-lg font-bold">₱{laundryPlatformProfit.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-white/50 text-[10px]">Riders</p>
              <p className="text-lg font-bold">₱{totalRiderCommission.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Grocery & Laundry Side by Side */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* Grocery */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-red-50 border-b border-red-100">
              <h3 className="font-bold text-sm text-[#D62828] flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                Grocery
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Orders Delivered</span>
                <span className="text-sm font-bold">{gDelivered.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Total Revenue</span>
                <span className="text-sm font-bold">₱{groceryRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Delivery Fees Collected</span>
                <span className="text-sm font-bold">₱{groceryDeliveryFees.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 flex justify-between">
                <span className="text-xs text-gray-500">Rider Commission ({riderPercent}%)</span>
                <span className="text-sm font-bold text-[#D62828]">₱{groceryPlatformProfit.toLocaleString()}</span>
              </div>
              <div className="bg-green-50 rounded-lg px-3 py-2 flex justify-between">
                <span className="text-xs text-green-700 font-medium">Platform Profit</span>
                <span className="text-sm font-bold text-green-700">₱{groceryPlatformProfit.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Laundry */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
              <h3 className="font-bold text-sm text-blue-600 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /><circle cx="12" cy="14" r="4" strokeWidth={2} /></svg>
                Laundry
              </h3>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Orders Delivered</span>
                <span className="text-sm font-bold">{lDelivered.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Total Revenue</span>
                <span className="text-sm font-bold">₱{laundryRevenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Service Fees (to Partners)</span>
                <span className="text-sm font-bold">₱{laundryServiceFees.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Delivery Fees (Pickup + Return)</span>
                <span className="text-sm font-bold">₱{laundryDeliveryFees.toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-100 pt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Partner Commission ({partnerPercent}%)</span>
                  <span className="text-sm font-bold text-[#D62828]">₱{laundryPartnerCommission.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-gray-500">Rider Commission ({riderPercent}%)</span>
                  <span className="text-sm font-bold text-[#D62828]">₱{laundryRiderCommission.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-green-50 rounded-lg px-3 py-2 flex justify-between">
                <span className="text-xs text-green-700 font-medium">Platform Profit</span>
                <span className="text-sm font-bold text-green-700">₱{(laundryPartnerCommission + laundryRiderCommission).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Breakdown Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
            <h3 className="font-bold text-sm text-[#1a1a2e]">Income Breakdown</h3>
          </div>
          <div className="divide-y divide-gray-50">
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-[#D62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Grocery Rider Commission</p>
                  <p className="text-[10px] text-gray-400">{riderPercent}% of ₱{groceryDeliveryFees} delivery fees</p>
                </div>
              </div>
              <span className="font-bold text-sm text-green-600">+₱{groceryPlatformProfit}</span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Laundry Rider Commission</p>
                  <p className="text-[10px] text-gray-400">{riderPercent}% of ₱{laundryDeliveryFees} delivery fees</p>
                </div>
              </div>
              <span className="font-bold text-sm text-green-600">+₱{laundryRiderCommission}</span>
            </div>
            <div className="px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">Laundry Partner Commission</p>
                  <p className="text-[10px] text-gray-400">{partnerPercent}% of ₱{laundryServiceFees} service fees</p>
                </div>
              </div>
              <span className="font-bold text-sm text-green-600">+₱{laundryPartnerCommission}</span>
            </div>
            <div className="px-5 py-4 flex items-center justify-between bg-green-50">
              <span className="font-bold text-sm text-green-800">Total Platform Income</span>
              <span className="font-black text-lg text-green-700">₱{totalPlatformIncome.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
