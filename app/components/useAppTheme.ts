"use client"

import { useEffect } from "react"

export function useAppTheme() {
  useEffect(() => {
    fetch("/api/settings/theme")
      .then(r => r.json())
      .then((t: { themeType: string; themeColor: string; themeColorTo: string; themeTextColor: string }) => {
        const root = document.documentElement
        root.style.setProperty("--theme-color", t.themeColor)
        root.style.setProperty("--theme-color-to", t.themeColorTo)
        root.style.setProperty("--theme-text", t.themeTextColor)
        root.style.setProperty("--theme-type", t.themeType)
        root.style.setProperty("--primary", t.themeColor)
        // Expose as data attribute for CSS gradient usage
        root.setAttribute("data-theme-type", t.themeType)
      })
      .catch(() => {})
  }, [])
}
