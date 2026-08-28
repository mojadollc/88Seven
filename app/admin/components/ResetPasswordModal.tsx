"use client"

import { useState } from "react"

export function ResetPasswordModal({ email, onClose }: { email: string; onClose: () => void }) {
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; message?: string; error?: string } | null>(null)

  const handleReset = async () => {
    if (!password || password.length < 6) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword: password }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ success: true, message: data.message })
      } else {
        setResult({ error: data.error })
      }
    } catch {
      setResult({ error: "Network error" })
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-[#1F2937] px-6 py-4">
          <h2 className="font-bold text-white">Set Temporary Password</h2>
          <p className="text-white/60 text-xs mt-0.5">{email}</p>
        </div>
        <div className="p-6 space-y-4">
          {result?.success ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-gray-800">Password Updated!</p>
              <p className="text-xs text-gray-400 mt-1">New password: <span className="font-mono font-bold text-gray-700">{password}</span></p>
              <button onClick={onClose} className="mt-4 bg-[#1F2937] text-white px-6 py-2 rounded-lg text-sm font-bold">Done</button>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">New Password</label>
                <input
                  type="text"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-2 outline-none focus:border-blue-600 font-mono"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {["temp123", "password1", "reset2024"].map((p) => (
                  <button key={p} onClick={() => setPassword(p)} className="text-[10px] bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg font-medium hover:bg-gray-200">{p}</button>
                ))}
              </div>
              {result?.error && (
                <p className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-lg">{result.error}</p>
              )}
              <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={handleReset} disabled={loading || password.length < 6} className="flex-1 bg-[#16A34A] text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">
                  {loading ? "Setting..." : "Set Password"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
