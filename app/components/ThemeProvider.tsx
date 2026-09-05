"use client"

import { useAppTheme } from "./useAppTheme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useAppTheme()
  return <>{children}</>
}
