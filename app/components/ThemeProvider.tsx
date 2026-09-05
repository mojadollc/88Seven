"use client"

import { createContext, useContext } from "react"

const LogoContext = createContext<string>("")

export function useLogoUrl() {
  return useContext(LogoContext)
}

export function ThemeProvider({ children, logoUrl }: { children: React.ReactNode; logoUrl: string }) {
  return (
    <LogoContext.Provider value={logoUrl}>
      {children}
    </LogoContext.Provider>
  )
}
