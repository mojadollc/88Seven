"use client"

import { useEffect, useState } from "react"

export function useLogo() {
  const [logoUrl, setLogoUrl] = useState<string>("")
  useEffect(() => {
    fetch("/api/settings/logo")
      .then(r => r.json())
      .then(d => setLogoUrl(d.logoUrl ?? ""))
      .catch(() => {})
  }, [])
  return logoUrl
}
