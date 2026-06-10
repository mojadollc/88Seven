"use client"

import { useEffect, useState } from "react"
import { getAllCustomers, getAllOrders, type CustomerProfile, type Order } from "@/lib/firebase"

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null)

  useEffect(() => {
    async function load() {
      const [c, o] = await Promise.all([getAllCustomers(), getAllOrders()])
      setCustomers(c)
      setOrders(o)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = customers.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  const getCustomerOrders = (uid: string) => orders.filter((o) => o.customerId === uid)
  const getCustomerStats = (uid: string) => {
    const co = getCustomerOrders(uid)
    return {
      total: co.length,
      delivered: co.filter((o) => o.status === "delivered").length,
      spent: co.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0),
    }
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1a1a2e]">Customers</h1>
          <span className="text-xs bg-gray-100 px-3 py-1.5 rounded-lg font-medium text-gray-600">{customers.length} registered</span>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#1a1a2e]">{customers.length}</p>
            <p className="text-xs text-gray-400">Total Customers</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-green-600">{customers.filter((c) => getCustomerStats(c.uid).total > 0).length}</p>
            <p className="text-xs text-gray-400">With Orders</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{orders.filter((o) => o.status === "delivered").length}</p>
            <p className="text-xs text-gray-400">Total Deliveries</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#D62828]">₱{orders.filter((o) => o.status === "delivered").reduce((s, o) => s + o.total, 0).toFixed(0)}</p>
            <p className="text-xs text-gray-400">Total Revenue</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
          <div className="p-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828]/20"
              />
            </div>
          </div>
        </div>

        {/* Customer List */}
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading customers...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            </div>
            <p className="text-gray-400 text-sm">No customers found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((customer) => {
              const stats = getCustomerStats(customer.uid)
              return (
                <div key={customer.uid} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[#D62828]/10 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-[#D62828]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <div>
                        <p className="font-bold text-sm text-gray-800">{customer.name}</p>
                        <p className="text-xs text-gray-400">{customer.email} • {customer.phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">{stats.total} orders • {stats.delivered} delivered</p>
                        <p className="text-sm font-bold text-[#D62828]">₱{stats.spent.toFixed(0)} spent</p>
                      </div>
                      <button
                        onClick={() => setSelectedCustomer(selectedCustomer?.uid === customer.uid ? null : customer)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium transition-colors"
                      >
                        {selectedCustomer?.uid === customer.uid ? "Hide" : "History"}
                      </button>
                    </div>
                  </div>

                  {/* Mobile stats */}
                  <div className="px-5 pb-3 sm:hidden">
                    <p className="text-xs text-gray-400">{stats.total} orders • {stats.delivered} delivered • <span className="text-[#D62828] font-bold">₱{stats.spent.toFixed(0)}</span></p>
                  </div>

                  {/* Order History */}
                  {selectedCustomer?.uid === customer.uid && (
                    <div className="border-t border-gray-100 bg-gray-50 px-5 py-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Order History</p>
                      {getCustomerOrders(customer.uid).length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">No orders yet</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {getCustomerOrders(customer.uid).map((order) => (
                            <div key={order.id} className="bg-white rounded-lg border border-gray-100 px-4 py-3 flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                                    order.status === "delivered" ? "bg-green-100 text-green-800" :
                                    order.status === "cancelled" || order.status === "rejected" ? "bg-red-100 text-red-800" :
                                    "bg-yellow-100 text-yellow-800"
                                  }`}>
                                    {order.status.replace(/_/g, " ")}
                                  </span>
                                  <span className="text-[10px] text-gray-400 font-mono">#{order.id.slice(0, 8)}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  {order.items.length} items • {order.createdAt?.toDate?.()?.toLocaleDateString?.(undefined, { month: "short", day: "numeric", year: "numeric" }) || ""}
                                </p>
                              </div>
                              <span className="text-sm font-bold text-gray-800">₱{order.total.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
