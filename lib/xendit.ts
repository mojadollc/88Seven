export async function createXenditPayment(params: {
  amount: number
  description: string
  externalId: string
  payerEmail?: string
  paymentMethods?: string[]
  successRedirectUrl?: string
  failureRedirectUrl?: string
}): Promise<{ invoiceUrl: string; invoiceId: string } | null> {
  try {
    const res = await fetch("/api/xendit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    })
    const data = await res.json()
    if (data.invoiceUrl) return data
    console.error("Xendit error:", data.error)
    return null
  } catch (e) {
    console.error("Payment error:", e)
    return null
  }
}
