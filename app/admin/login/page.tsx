"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { setAuth } from "@/lib/auth"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Invalid credentials")
      if (data.user.role !== "admin") throw new Error("Not authorized")
      setAuth(data.token, data.user)
      localStorage.setItem("admin_token", data.token)
      router.push("/admin")
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="flex items-center justify-center mb-6">
          <a href="/" className="font-black text-lg text-[#1F2937] tracking-tight">Gruwcer</a>
        </div>
        <h1 className="text-sm text-gray-500 text-center mb-6">Admin Login</h1>
        {error && <p className="text-amber-600 text-sm text-center mb-4">{error}</p>}
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 outline-none focus:border-[#319F44]" required />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 outline-none focus:border-[#319F44]" required />
        <button type="submit" disabled={loading}
          className="w-full bg-[#319F44] text-white font-bold py-2.5 rounded text-sm hover:bg-[#267a34] transition-colors disabled:opacity-50">
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  )
}
