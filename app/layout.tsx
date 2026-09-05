import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import Script from "next/script"
import PullToRefresh from "./components/PullToRefresh"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

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
    "msapplication-TileColor": "#4194AF",
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
    { media: "(prefers-color-scheme: light)", color: "#4194AF" },
    { media: "(prefers-color-scheme: dark)", color: "#4194AF" },
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
        <meta name="theme-color" content="#4194AF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        {/* TWA: Digital Asset Links verification */}
        <link rel="assetlinks.json" href="/.well-known/assetlinks.json" />
      </head>
      <body className={`${inter.className} bg-[#F4F5F7] antialiased`} suppressHydrationWarning>
        <PullToRefresh>
          {children}
        </PullToRefresh>
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
