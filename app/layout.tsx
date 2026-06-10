import type { Metadata, Viewport } from "next"
import { Poppins } from "next/font/google"
import Script from "next/script"
import PullToRefresh from "./components/PullToRefresh"
import "./globals.css"

const poppins = Poppins({ subsets: ["latin"], weight: ["300", "400", "500", "600", "700", "800", "900"] })

export const metadata: Metadata = {
  title: "88 Seven | Grocery, Laundry & Services",
  description: "Your everyday super app. Grocery delivery, laundry pickup, home services — all in one place. Lapu-Lapu City, Cebu.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "88 Seven",
    startupImage: [
      { url: "/icons/icon-512.png", media: "(device-width: 375px) and (device-height: 812px)" },
      { url: "/icons/icon-512.png", media: "(device-width: 414px) and (device-height: 896px)" },
      { url: "/icons/icon-512.png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "application-name": "88 Seven",
    "apple-mobile-web-app-title": "88 Seven",
    "msapplication-TileColor": "#D62828",
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
    { media: "(prefers-color-scheme: light)", color: "#D62828" },
    { media: "(prefers-color-scheme: dark)", color: "#D62828" },
  ],
  viewportFit: "cover",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192.png" />
        <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#D62828" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* TWA: Digital Asset Links verification */}
        <link rel="assetlinks.json" href="/.well-known/assetlinks.json" />
      </head>
      <body className={`${poppins.className} bg-[#fafafa] antialiased`} suppressHydrationWarning>
        <PullToRefresh>
          {children}
        </PullToRefresh>
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if('serviceWorker' in navigator){
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
