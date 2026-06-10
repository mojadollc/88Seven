"use client"

import { useEffect, useState } from "react"
import { onCustomerAuthChange, getCustomerProfile, getCustomerOrders, getPartnerProfile, getDrivers, customerLogout, type Order, type CustomerProfile } from "@/lib/firebase"
import { getFirestore, collection, query, where, orderBy, onSnapshot } from "firebase/firestore"
import type { User } from "firebase/auth"

const db = getFirestore()

type LaundryOrder = {
  id: string
  serviceName: string
  weight: number
  totalPrice: number
  pickupAddress: string
  partnerName: string
  status: string
  createdAt: any
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  preparing: "bg-purple-100 text-purple-800",
  ready_for_pickup: "bg-orange-100 text-orange-800",
  rider_accepted: "bg-cyan-100 text-cyan-800",
  rider_at_store: "bg-teal-100 text-teal-800",
  rider_picked_up: "bg-indigo-100 text-indigo-800",
  out_for_delivery: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  rejected: "bg-red-100 text-red-800",
  accepted: "bg-blue-100 text-blue-800",
  rider_pickup: "bg-cyan-100 text-cyan-800",
  at_laundromat: "bg-purple-100 text-purple-800",
  washing: "bg-indigo-100 text-indigo-800",
  ready: "bg-orange-100 text-orange-800",
  rider_return: "bg-teal-100 text-teal-800",
}

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<CustomerProfile | null>(null)
  const [groceryOrders, setGroceryOrders] = useState<Order[]>([])
  const [laundryOrders, setLaundryOrders] = useState<LaundryOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<"all" | "grocery" | "laundry">("all")
  const [dateFilter, setDateFilter] = useState<"7d" | "30d" | "3m" | "all">("all")
  const [visibleCount, setVisibleCount] = useState(15)

  useEffect(() => {
    const unsub = onCustomerAuthChange(async (u) => {
      setUser(u)
      if (u) {
        // Check if partner — redirect to partner dashboard
        const partnerProfile = await getPartnerProfile(u.uid)
        if (partnerProfile) {
          window.location.href = "/partner"
          return
        }
        // Check if rider — redirect to driver dashboard
        const allDrivers = await getDrivers()
        const riderProfile = allDrivers.find((d) => (d as any).uid === u.uid || d.email === u.email)
        if (riderProfile) {
          window.location.href = "/driver"
          return
        }
        const p = await getCustomerProfile(u.uid)
        setProfile(p)
        const o = await getCustomerOrders(u.uid)
        setGroceryOrders(o)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  // Laundry orders listener
  useEffect(() => {
    if (!user) return
    const q = query(collection(db, "laundryOrders"), where("customerId", "==", user.uid), orderBy("createdAt", "desc"))
    const unsub = onSnapshot(q, (snap) => {
      setLaundryOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as LaundryOrder))
    })
    return () => unsub()
  }, [user])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 border-4 border-[#D62828] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!user) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </div>
        <h2 className="font-bold text-lg text-gray-800 mb-1">Sign in to view your orders</h2>
        <p className="text-sm text-gray-400 mb-4">Access all your grocery and laundry orders</p>
        <a href="/auth?redirect=/account" className="inline-block bg-[#D62828] text-white px-6 py-2.5 rounded-lg text-sm font-bold hover:bg-[#b71c1c] transition-colors">
          Sign In
        </a>
      </div>
    </div>
  )

  const activeGrocery = groceryOrders.filter((o) => !["delivered", "cancelled", "rejected"].includes(o.status))
  const activeLaundry = laundryOrders.filter((o) => !["delivered", "cancelled"].includes(o.status))
  const totalActive = activeGrocery.length + activeLaundry.length
  const totalSpent = groceryOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0) + laundryOrders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.totalPrice, 0)

  // Date filtering
  const getDateCutoff = () => {
    if (dateFilter === "all") return null
    const now = new Date()
    if (dateFilter === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    if (dateFilter === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
  }
  const cutoff = getDateCutoff()
  const filteredGrocery = groceryOrders.filter((o) => !cutoff || (o.createdAt?.toDate?.() && o.createdAt.toDate() >= cutoff))
  const filteredLaundry = laundryOrders.filter((o) => !cutoff || (o.createdAt?.toDate?.() && o.createdAt.toDate() >= cutoff))

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#D62828] text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm">Home</span>
          </a>
          <button onClick={() => customerLogout()} className="text-xs text-white/70 hover:text-white">Logout</button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto pb-8">
        {/* Profile */}
        <div className="bg-white px-4 py-5 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-[#D62828]/10 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-[#D62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </div>
            <div>
              <h1 className="font-bold text-lg text-gray-800">{profile?.name || "Customer"}</h1>
              <p className="text-xs text-gray-400">{user.email}</p>
              {profile?.phone && <p className="text-xs text-gray-400">{profile.phone}</p>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 px-4 py-4">
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-blue-600">{totalActive}</p>
            <p className="text-[9px] text-gray-400">Active</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-[#D62828]">{groceryOrders.length}</p>
            <p className="text-[9px] text-gray-400">Grocery</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-blue-600">{laundryOrders.length}</p>
            <p className="text-[9px] text-gray-400">Laundry</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-gray-100 text-center">
            <p className="text-lg font-bold text-green-600">₱{totalSpent.toFixed(0)}</p>
            <p className="text-[9px] text-gray-400">Spent</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-3 gap-3">
            <a href="/grocery" className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 bg-red-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#D62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Grocery</span>
            </a>
            <a href="/laundry" className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /><circle cx="12" cy="14" r="4" strokeWidth={2} /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h2m2 0h2" /></svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Laundry</span>
            </a>
            <a href="/account/wallet" className="flex items-center gap-3 bg-white rounded-xl p-3 border border-gray-100 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              </div>
              <span className="text-xs font-medium text-gray-700">Wallet</span>
            </a>
          </div>
        </div>

        {/* Date Filter */}
        <div className="px-4 mb-3 flex gap-2 overflow-x-auto">
          {([["7d", "7 Days"], ["30d", "30 Days"], ["3m", "3 Months"], ["all", "All Time"]] as [typeof dateFilter, string][]).map(([key, label]) => (
            <button key={key} onClick={() => { setDateFilter(key); setVisibleCount(15) }} className={`px-3 py-1.5 text-[10px] rounded-lg font-medium whitespace-nowrap transition-colors ${dateFilter === key ? "bg-[#D62828] text-white" : "bg-white border border-gray-200 text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white flex border-b border-gray-200 sticky top-[48px] z-20">
          {([["all", `All (${groceryOrders.length + laundryOrders.length})`], ["grocery", `Grocery (${groceryOrders.length})`], ["laundry", `Laundry (${laundryOrders.length})`]] as ["all" | "grocery" | "laundry", string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex-1 py-3 text-xs font-bold transition-colors relative ${tab === key ? "text-[#D62828]" : "text-gray-400"}`}>
              {label}
              {tab === key && <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-[#D62828] rounded-full" />}
            </button>
          ))}
        </div>

        {/* Orders */}
        <div className="px-4 py-4 space-y-3">
          {/* Grocery Orders */}
          {(tab === "all" || tab === "grocery") && filteredGrocery.slice(0, visibleCount).map((order) => (
            <a key={`g-${order.id}`} href={`/order?id=${order.id}`} className="block bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#D62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-300">Grocery</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{order.items.length} items • {order.createdAt?.toDate?.()?.toLocaleDateString?.(undefined, { month: "short", day: "numeric" }) || ""}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#D62828]">₱{order.total.toFixed(0)}</span>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5">
                    <span>Track</span>
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </div>
            </a>
          ))}

          {/* Laundry Orders */}
          {(tab === "all" || tab === "laundry") && filteredLaundry.slice(0, visibleCount).map((order) => (
            <div key={`l-${order.id}`} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6a2 2 0 012-2h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" /><circle cx="12" cy="14" r="4" strokeWidth={2} /></svg>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${STATUS_COLORS[order.status] || "bg-gray-100 text-gray-600"}`}>
                        {order.status.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-gray-300">Laundry</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{order.serviceName} • {order.weight}kg • {order.partnerName}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-blue-600">₱{order.totalPrice}</span>
              </div>
            </div>
          ))}

          {/* Load More */}
          {((tab === "all" || tab === "grocery") && filteredGrocery.length > visibleCount) ||
           ((tab === "all" || tab === "laundry") && filteredLaundry.length > visibleCount) ? (
            <button onClick={() => setVisibleCount((c) => c + 15)} className="w-full py-3 bg-white rounded-xl border border-gray-200 text-xs font-bold text-gray-500 hover:bg-gray-50 transition-colors">
              Load More Orders
            </button>
          ) : null}

          {/* Empty */}
          {((tab === "all" && filteredGrocery.length === 0 && filteredLaundry.length === 0) ||
            (tab === "grocery" && filteredGrocery.length === 0) ||
            (tab === "laundry" && filteredLaundry.length === 0)) && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              </div>
              <p className="text-gray-400 text-sm">No orders yet</p>
              <div className="flex gap-3 justify-center mt-4">
                <a href="/grocery" className="text-xs bg-[#D62828] text-white px-4 py-2 rounded-lg font-bold">Shop Grocery</a>
                <a href="/laundry" className="text-xs bg-blue-600 text-white px-4 py-2 rounded-lg font-bold">Book Laundry</a>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
