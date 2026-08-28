"use client"
import { useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"

function SuccessContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = searchParams.get("id") || ""
  // Strip "order_" prefix if present
  const orderId = id.startsWith("order_") ? id.replace("order_", "") : id

  useEffect(() => {
    if (orderId) {
      const t = setTimeout(() => router.push(`/order?id=${orderId}`), 3000)
      return () => clearTimeout(t)
    }
  }, [orderId, router])

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm w-full">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="font-bold text-2xl text-gray-800 mb-2">Payment Successful!</h1>
        <p className="text-sm text-gray-500 mb-1">Your payment has been confirmed.</p>
        <p className="text-xs text-gray-400 mb-6">Redirecting to your order...</p>
        {orderId && (
          <a
            href={`/order?id=${orderId}`}
            className="inline-block bg-[#16A34A] text-white px-6 py-3 rounded-xl font-bold text-sm"
          >
            Track My Order
          </a>
        )}
      </div>
    </main>
  )
}

export default function PaymentSuccess() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#16A34A] border-t-transparent rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  )
}
