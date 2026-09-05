import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"
import PullToRefresh from "./components/PullToRefresh"
import { ThemeProvider } from "./components/ThemeProvider"
import "./globals.css"

// Force this layout to run on every request — never cached at build time
export const dynamic = "force-dynamic"
export const revalidate = 0

async function getTheme() {
  try {
    const { prisma } = await import("@/lib/prisma")
    await (prisma as any).$executeRawUnsafe(`
      ALTER TABLE "AppSettings"
        ADD COLUMN IF NOT EXISTS "themeType" TEXT NOT NULL DEFAULT 'solid',
        ADD COLUMN IF NOT EXISTS "themeColor" TEXT NOT NULL DEFAULT '#319F44',
        ADD COLUMN IF NOT EXISTS "themeColorTo" TEXT NOT NULL DEFAULT '#59EBC6',
        ADD COLUMN IF NOT EXISTS "themeTextColor" TEXT NOT NULL DEFAULT '#ffffff',
        ADD COLUMN IF NOT EXISTS "themeBgColor" TEXT NOT NULL DEFAULT '#F5F5DB',
        ADD COLUMN IF NOT EXISTS "themeDeliveryBannerColor" TEXT NOT NULL DEFAULT '#267a34',
        ADD COLUMN IF NOT EXISTS "themeDeliveryBannerTextColor" TEXT NOT NULL DEFAULT '#ffffff',
        ADD COLUMN IF NOT EXISTS "themeFooterBgColor" TEXT NOT NULL DEFAULT '#1a1a1a',
        ADD COLUMN IF NOT EXISTS "themeFooterTextColor" TEXT NOT NULL DEFAULT '#ffffff',
        ADD COLUMN IF NOT EXISTS "logoUrl" TEXT NOT NULL DEFAULT '',
        ADD COLUMN IF NOT EXISTS "themeHeaderBgColor" TEXT NOT NULL DEFAULT '#319F44',
        ADD COLUMN IF NOT EXISTS "themeHeaderTextColor" TEXT NOT NULL DEFAULT '#ffffff'
    `)
    const rows = await (prisma as any).$queryRaw`
      SELECT "themeType","themeColor","themeColorTo","themeTextColor","themeBgColor",
             "themeDeliveryBannerColor","themeDeliveryBannerTextColor",
             "themeFooterBgColor","themeFooterTextColor","logoUrl",
             "themeHeaderBgColor","themeHeaderTextColor"
      FROM "AppSettings" WHERE key = 'global' LIMIT 1
    `
    const r = Array.isArray(rows) ? rows[0] : null
    return {
      themeType:                  r?.themeType                  ?? "solid",
      themeColor:                 r?.themeColor                 ?? "#319F44",
      themeColorTo:               r?.themeColorTo               ?? "#59EBC6",
      themeTextColor:             r?.themeTextColor             ?? "#ffffff",
      themeBgColor:               r?.themeBgColor               ?? "#F5F5DB",
      themeDeliveryBannerColor:   r?.themeDeliveryBannerColor   ?? "#267a34",
      themeDeliveryBannerTextColor: r?.themeDeliveryBannerTextColor ?? "#ffffff",
      themeFooterBgColor:         r?.themeFooterBgColor         ?? "#1a1a1a",
      themeFooterTextColor:       r?.themeFooterTextColor       ?? "#ffffff",
      themeHeaderBgColor:         r?.themeHeaderBgColor         ?? "#319F44",
      themeHeaderTextColor:       r?.themeHeaderTextColor       ?? "#ffffff",
      logoUrl:                    r?.logoUrl                    ?? "",
    }
  } catch {
    return {
      themeType: "solid", themeColor: "#319F44", themeColorTo: "#59EBC6",
      themeTextColor: "#ffffff", themeBgColor: "#F5F5DB",
      themeDeliveryBannerColor: "#267a34", themeDeliveryBannerTextColor: "#ffffff",
      themeFooterBgColor: "#1a1a1a", themeFooterTextColor: "#ffffff",
      themeHeaderBgColor: "#319F44", themeHeaderTextColor: "#ffffff", logoUrl: "",
    }
  }
}

const font = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] })

export const metadata: Metadata = {
  title: "Gruwcer | Grocery, Laundry & Services",
  description: "Your everyday super app. Grocery delivery, laundry pickup, home services — all in one place. Lapu-Lapu City, Cebu.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Gruwcer",
    startupImage: [
      { url: "/icons/icon-512.png", media: "(device-width: 375px) and (device-height: 812px)" },
      { url: "/icons/icon-512.png", media: "(device-width: 414px) and (device-height: 896px)" },
      { url: "/icons/icon-512.png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "Gruwcer",
    "apple-mobile-web-app-title": "Gruwcer",
    "msapplication-TileColor": "#319F44",
    "msapplication-tap-highlight": "no",
    "format-detection": "telephone=no",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#319F44" },
    { media: "(prefers-color-scheme: dark)", color: "#319F44" },
  ],
  viewportFit: "cover",
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = await getTheme()
  const themeBg = t.themeType === "gradient"
    ? `linear-gradient(135deg, ${t.themeColor}, ${t.themeColorTo})`
    : t.themeColor

  // Injected server-side as a <style> tag — runs before any JS, no flash, always fresh from DB
  const cssVars = `
    :root {
      --theme-color: ${t.themeColor};
      --theme-color-to: ${t.themeColorTo};
      --theme-text: ${t.themeTextColor};
      --theme-bg: ${themeBg};
      --theme-page-bg: ${t.themeBgColor};
      --theme-delivery-banner: ${t.themeDeliveryBannerColor};
      --theme-delivery-banner-text: ${t.themeDeliveryBannerTextColor};
      --theme-footer-bg: ${t.themeFooterBgColor};
      --theme-footer-text: ${t.themeFooterTextColor};
      --theme-header-bg: ${t.themeHeaderBgColor};
      --theme-header-text: ${t.themeHeaderTextColor};
      --primary: ${t.themeColor};
    }
    body { background-color: ${t.themeBgColor}; }
  `

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Theme CSS vars injected server-side on every request — zero client caching */}
        <style dangerouslySetInnerHTML={{ __html: cssVars }} />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192.png" />
        <meta name="theme-color" content={t.themeColor} />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="assetlinks.json" href="/.well-known/assetlinks.json" />
      </head>
      <body className={`${font.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider logoUrl={t.logoUrl}>
          <PullToRefresh>
            {children}
          </PullToRefresh>
        </ThemeProvider>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if('serviceWorker' in navigator && window.location.hostname !== 'localhost'){
              window.addEventListener('load',()=>{
                navigator.serviceWorker.register('/sw.js').then(reg=>{
                  reg.addEventListener('updatefound',()=>{
                    const newWorker=reg.installing;
                    if(newWorker){
                      newWorker.addEventListener('statechange',()=>{
                        if(newWorker.state==='activated'&&navigator.serviceWorker.controller){
                        }
                      })
                    }
                  })
                })
              })
            }
          `}
        </Script>
        <Script id="pwa-update-check" strategy="afterInteractive">
          {`
            setInterval(()=>{
              if(navigator.serviceWorker&&navigator.serviceWorker.controller){
                navigator.serviceWorker.controller.postMessage({type:'CHECK_UPDATE'})
              }
            },1800000)
          `}
        </Script>
      </body>
    </html>
  )
}
