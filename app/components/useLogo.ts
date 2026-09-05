"use client"

import { useEffect, useState } from "react"

let cached: string | null = null

export function useLogo() {
  const [logoUrl, setLogoUrl] = useState<string>(cached ?? "")
  useEffect(() => {
    if (cached !== null) { setLogoUrl(cached); return }
    fetch("/api/settings/logo")
      .then(r => r.json())
      .then(d => { cached = d.logoUrl ?? ""; setLogoUrl(cached!) })
      .catch(() => { cached = ""; setLogoUrl("") })
  }, [])
  return logoUrl
}
