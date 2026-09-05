"use client"

import { useEffect } from "react"

export function useAppTheme() {
  useEffect(() => {
    fetch("/api/settings/theme")
      .then(r => r.json())
      .then((t: { themeType: string; themeColor: string; themeColorTo: string; themeTextColor: string; themeBgColor: string }) => {
        const root = document.documentElement
        const bg = t.themeType === "gradient"
          ? `linear-gradient(135deg, ${t.themeColor}, ${t.themeColorTo})`
          : t.themeColor

        root.style.setProperty("--theme-color", t.themeColor)
        root.style.setProperty("--theme-color-to", t.themeColorTo)
        root.style.setProperty("--theme-text", t.themeTextColor)
        root.style.setProperty("--theme-bg", bg)
        root.style.setProperty("--theme-page-bg", t.themeBgColor)
        root.style.setProperty("--primary", t.themeColor)

        // Apply body background
        document.body.style.backgroundColor = t.themeBgColor
      })
      .catch(() => {})
  }, [])
}
