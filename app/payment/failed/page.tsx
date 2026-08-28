"use client"

import { Suspense, useState } from "react"
import { useSearchParams } from "next/navigation"


function FailedContent() {
  const searchParams = useSearchParams()
  const id = searchParams.get("id") || ""
  const service = searchParams.get("service") || "grocery"
  const [cancelling, setCancelling] = useState(false)
  const [cancelled, setCancelled] = useState(false)

  const apiMap: Record<string, string> = {
    grocery: "orders",
    laundry: "laundry-orders",
    services: "service-bookings",
  }

  const handleCancel = async () => {
    if (!id) return
    setCancelling(true)
    try {
      const endpoint = apiMap[service] || "orders"
      await fetch(`/api/${endpoint}/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "cancelled" }) })
      setCancelled(true)
    } catch (e) {
      console.error("Failed to cancel:", e)
    } finally {
      setCancelling(false)
    }
  }

  if (cancelled) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm w-full">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="font-bold text-2xl text-gray-800 mb-2">Order Cancelled</h1>
          <p className="text-sm text-gray-500 mb-6">Your order has been cancelled successfully.</p>
          <a href="/" className="block bg-[#16A34A] text-white px-6 py-3 rounded-xl font-bold text-sm">
            Go to Home
          </a>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-bold text-2xl text-gray-800 mb-2">Payment Failed</h1>
        <p className="text-sm text-gray-500 mb-6">Something went wrong with your payment. Your order has not been confirmed.</p>
        <div className="space-y-3">
          <a href={`/${service}`} className="block bg-[#16A34A] text-white px-6 py-3 rounded-xl font-bold text-sm">
            Try Again
          </a>
          <button
            onClick={id ? handleCancel : () => { window.location.href = "/" }}
            disabled={cancelling}
            className="block w-full border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            {cancelling ? "Cancelling..." : "Cancel Order & Go Home"}
          </button>
        </div>
      </div>
    </main>
  )
}

export default function PaymentFailed() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#16A34A] border-t-transparent rounded-full animate-spin" /></div>}>
      <FailedContent />
    </Suspense>
  )
}
