// Client-side auth helpers — replaces Firebase auth
// Token stored in localStorage as "token"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function getUser(): { id: string; name: string; email: string; role: string; status: string } | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("user")
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

export function setAuth(token: string, user: any) {
  localStorage.setItem("token", token)
  localStorage.setItem("user", JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

export function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export async function fetchMe() {
  const token = getToken()
  if (!token) return null
  const res = await fetch("/api/users/me", { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) { clearAuth(); return null }
  return res.json()
}
