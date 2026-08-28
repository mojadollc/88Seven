import { initializeApp, getApps, cert, App } from "firebase-admin/app"
import { getAuth } from "firebase-admin/auth"

let app: App

if (!getApps().length) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  let serviceAccount: any = undefined

  if (raw) {
    try {
      serviceAccount = JSON.parse(raw)
    } catch {
      // Handle escaped JSON or single-quoted env vars
      try {
        serviceAccount = JSON.parse(raw.replace(/'/g, '"'))
      } catch {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY")
      }
    }
  }

  app = initializeApp(
    serviceAccount
      ? { credential: cert(serviceAccount), projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
      : { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
  )
} else {
  app = getApps()[0]
}

export const adminAuth = getAuth(app)
