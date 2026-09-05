"use client"

import { useEffect } from "react"

const CACHE_KEY = "__gruwcer_theme"

function applyVars(t: any) {
  const bg = t.themeType === "gradient"
    ? `linear-gradient(135deg, ${t.themeColor}, ${t.themeColorTo})`
    : t.themeColor
  const root = document.documentElement
  root.style.setProperty("--theme-color", t.themeColor)
  root.style.setProperty("--theme-color-to", t.themeColorTo)
  root.style.setProperty("--theme-text", t.themeTextColor)
  root.style.setProperty("--theme-bg", bg)
  root.style.setProperty("--theme-page-bg", t.themeBgColor)
  root.style.setProperty("--theme-delivery-banner", t.themeDeliveryBannerColor ?? "#267a34")
  root.style.setProperty("--theme-delivery-banner-text", t.themeDeliveryBannerTextColor ?? "#ffffff")
  root.style.setProperty("--theme-footer-bg", t.themeFooterBgColor ?? "#1a1a1a")
  root.style.setProperty("--theme-footer-text", t.themeFooterTextColor ?? "#ffffff")
  root.style.setProperty("--primary", t.themeColor)
  document.body.style.backgroundColor = t.themeBgColor
}

export function useAppTheme() {
  useEffect(() => {
    // Don't apply theme vars on admin pages
    if (window.location.pathname.startsWith("/admin")) return

    // 1. Apply cached theme instantly (no flash)
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) applyVars(JSON.parse(cached))
    } catch {}

    // 2. Fetch fresh from DB, update DOM + cache
    fetch("/api/settings/theme")
      .then(r => r.json())
      .then((t: any) => {
        applyVars(t)
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(t)) } catch {}
      })
      .catch(() => {})
  }, [])
}
