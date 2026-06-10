"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { adminLogin } from "@/lib/firebase"

export default function AdminLogin() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      await adminLogin(email, password)
      router.push("/admin")
    } catch {
      setError("Invalid email or password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <div className="flex items-center justify-center mb-6">
          <a href="/" className="font-black text-lg text-[#1a1a2e]">88 Seven</a>
        </div>
        <h1 className="text-sm text-gray-500 text-center mb-6">Admin Login</h1>
        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-3 outline-none focus:border-[#D62828]"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm mb-4 outline-none focus:border-[#D62828]"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#D62828] text-white font-bold py-2.5 rounded text-sm hover:bg-[#b71c1c] transition-colors disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log In"}
        </button>
      </form>
    </div>
  )
}
