import { NextRequest, NextResponse } from "next/server"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore, collection, query, where, getDocs, updateDoc, doc, addDoc, serverTimestamp, getDoc } from "firebase/firestore"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore(app)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { external_id, status, paid_amount } = body

    if (status === "PAID" || status === "SETTLED") {
      // Check if it's a rider wallet top-up
      if (external_id?.startsWith("wallet_")) {
        const driverId = external_id.replace("wallet_", "").split("_")[0]
        const ref = doc(db, "drivers", driverId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const current = snap.data().walletBalance || 0
          await updateDoc(ref, { walletBalance: current + paid_amount })
          await addDoc(collection(db, "walletTransactions"), {
            driverId,
            type: "topup",
            amount: paid_amount,
            transactionId: external_id,
            status: "completed",
            createdAt: serverTimestamp(),
          })
        }
      }

      // Customer wallet top-up
      if (external_id?.startsWith("customer_wallet_")) {
        const uid = external_id.replace("customer_wallet_", "").split("_")[0]
        const q = query(collection(db, "customers"), where("uid", "==", uid))
        const snap = await getDocs(q)
        if (snap.docs.length > 0) {
          const docRef = doc(db, "customers", snap.docs[0].id)
          const current = snap.docs[0].data().walletBalance || 0
          await updateDoc(docRef, { walletBalance: current + paid_amount })
          await addDoc(collection(db, "customerWalletTransactions"), {
            customerId: uid,
            type: "topup",
            amount: paid_amount,
            transactionId: external_id,
            note: "Wallet top-up",
            createdAt: serverTimestamp(),
          })
        }
      }

      // Partner wallet top-up
      if (external_id?.startsWith("partner_wallet_")) {
        const partnerId = external_id.replace("partner_wallet_", "").split("_")[0]
        const ref = doc(db, "partners", partnerId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const current = snap.data().walletBalance || 0
          await updateDoc(ref, { walletBalance: current + paid_amount })
          await addDoc(collection(db, "partnerWalletTransactions"), {
            partnerId,
            type: "topup",
            amount: paid_amount,
            transactionId: external_id,
            note: "Wallet top-up",
            createdAt: serverTimestamp(),
          })
        }
      }

      // Check if it's an order payment
      if (external_id?.startsWith("order_")) {
        const orderId = external_id.replace("order_", "")
        const ref = doc(db, "orders", orderId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          await updateDoc(ref, { paymentStatus: "paid", paymentMethod: "xendit", updatedAt: serverTimestamp() })
        }
      }

      // Laundry order payment
      if (external_id?.startsWith("laundry_")) {
        const orderId = external_id.replace("laundry_", "")
        const ref = doc(db, "laundryOrders", orderId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const currentStatus = snap.data().status
          const update: any = { paymentStatus: "paid", paymentMethod: "xendit", updatedAt: serverTimestamp() }
          // Move from awaiting_payment to pending so partner can see it
          if (currentStatus === "awaiting_payment") {
            update.status = "pending"
          }
          await updateDoc(ref, update)
        }
      }

      // Service booking payment
      if (external_id?.startsWith("service_")) {
        const bookingId = external_id.replace("service_", "")
        const ref = doc(db, "serviceBookings", bookingId)
        const snap = await getDoc(ref)
        if (snap.exists()) {
          const currentStatus = snap.data().status
          const update: any = { paymentStatus: "paid", paymentMethod: "xendit", updatedAt: serverTimestamp() }
          // Move from awaiting_payment to pending
          if (currentStatus === "awaiting_payment") {
            update.status = "pending"
          }
          await updateDoc(ref, update)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
