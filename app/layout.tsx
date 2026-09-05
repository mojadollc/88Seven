import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import Script from "next/script"
import PullToRefresh from "./components/PullToRefresh"
import { ThemeProvider } from "./components/ThemeProvider"
import "./globals.css"

async function getTheme() {
  try {
    const { prisma } = await import("@/lib/prisma")
    const rows = await (prisma as any).$queryRaw`
      SELECT "themeType", "themeColor", "themeColorTo", "themeTextColor", "themeBgColor"
      FROM "AppSettings" WHERE key = 'global' LIMIT 1
    `
    const row = Array.isArray(rows) ? rows[0] : null
    return {
      themeType: row?.themeType ?? "solid",
      themeColor: row?.themeColor ?? "#319F44",
      themeColorTo: row?.themeColorTo ?? "#59EBC6",
      themeTextColor: row?.themeTextColor ?? "#ffffff",
      themeBgColor: row?.themeBgColor ?? "#F5F5DB",
    }
  } catch {
    return { themeType: "solid", themeColor: "#319F44", themeColorTo: "#59EBC6", themeTextColor: "#ffffff", themeBgColor: "#F5F5DB" }
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
  const theme = await getTheme()
  const themeBg = theme.themeType === "gradient"
    ? `linear-gradient(135deg, ${theme.themeColor}, ${theme.themeColorTo})`
    : theme.themeColor
  const inlineTheme = `
    document.documentElement.style.setProperty('--theme-color', '${theme.themeColor}');
    document.documentElement.style.setProperty('--theme-color-to', '${theme.themeColorTo}');
    document.documentElement.style.setProperty('--theme-text', '${theme.themeTextColor}');
    document.documentElement.style.setProperty('--theme-bg', '${themeBg}');
    document.documentElement.style.setProperty('--theme-page-bg', '${theme.themeBgColor}');
    document.documentElement.style.setProperty('--primary', '${theme.themeColor}');
    document.body.style.backgroundColor = '${theme.themeBgColor}';
  `
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: inlineTheme }} />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#319F44" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* TWA: Digital Asset Links verification */}
        <link rel="assetlinks.json" href="/.well-known/assetlinks.json" />
      </head>
      <body className={`${font.className} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
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
                          // New version available — will activate on next visit
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
            // Check for app updates every 30 min
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
