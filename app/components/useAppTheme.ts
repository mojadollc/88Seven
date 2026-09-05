"use client"

import { useEffect } from "react"

export function useAppTheme() {
  useEffect(() => {
    fetch("/api/settings/theme")
      .then(r => r.json())
      .then((t: any) => {
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
        root.style.setProperty("--primary", t.themeColor)
        document.body.style.backgroundColor = t.themeBgColor
      })
      .catch(() => {})
  }, [])
}
