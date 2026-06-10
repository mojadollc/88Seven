import { NextRequest, NextResponse } from "next/server"

// Exact Xendit payment method codes based on activated account methods
const PAYMENT_METHOD_MAP = {
  all: ["GRABPAY", "MAYA", "SHOPEEPAY", "QRPH", "DD_BPI", "DD_UBP", "DD_RCBC", "BILLEASE", "CEBUANA", "LBC"],
  qrph: ["QRPH"],
  ewallet: ["GRABPAY", "MAYA", "SHOPEEPAY"],
  bank: ["DD_BPI", "DD_UBP", "DD_RCBC"],
  otc: ["CEBUANA", "LBC"],
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { amount, description, payerEmail, externalId, successRedirectUrl, failureRedirectUrl, paymentMethods } = body

    if (!amount || !description || !externalId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const response = await fetch("https://api.xendit.co/v2/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(process.env.XENDIT_SECRET_KEY + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        external_id: externalId,
        amount,
        description,
        payer_email: payerEmail || undefined,
        currency: "PHP",
        payment_methods: paymentMethods || PAYMENT_METHOD_MAP.all,
        success_redirect_url: successRedirectUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/success?id=${externalId}`,
        failure_redirect_url: failureRedirectUrl || `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/payment/failed?id=${externalId}`,
        invoice_duration: 3600,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error("Xendit error:", JSON.stringify(data))
      return NextResponse.json({ error: data.message || "Xendit API error", detail: data }, { status: response.status })
    }

    return NextResponse.json({ invoiceUrl: data.invoice_url, invoiceId: data.id, externalId: data.external_id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Server error" }, { status: 500 })
  }
}