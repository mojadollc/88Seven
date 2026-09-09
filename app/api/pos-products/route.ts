import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const POS_BASE = "https://pntos.payroo.xyz"
const STORE_ID = "8807"

function fixImageUrl(url: string | null | undefined): string {
  if (!url) return ""
  if (url.startsWith("data:") || url.startsWith("http")) return url
  return `${POS_BASE}${url}`
}

export async function GET() {
  try {
    const [res, settings, localProducts] = await Promise.all([
      fetch(`${POS_BASE}/api/products?storeId=${STORE_ID}`, { next: { revalidate: 300 } }),
      prisma.deliverySettings.findFirst(),
      prisma.product.findMany(),
    ])
    if (!res.ok) throw new Error(`POS API error: ${res.status}`)
    const json = await res.json()
    const overrides: Record<string, any> = {}
    localProducts.forEach((p: any) => { overrides[p.id] = p })
    const products = (json.data || []).map((p: any) => {
      const ov = overrides[p.id]
      return {
        ...p,
        imageUrl: fixImageUrl(ov?.imageUrl || p.imageUrl),
        category: ov?.category ?? (p.category === "School Supply" ? "Office & School Supply" : p.category === "Office Supply" ? "Office & School Supply" : p.category),
        bottleDeposit: ov?.bottleDeposit ?? null,
        showOnSite: ov ? ov.showOnSite : true,
        onSale: ov?.onSale ?? false,
        salePrice: ov?.salePrice ?? null,
      }
    })
    return NextResponse.json({
      products,
      storeLat: settings?.storeLat ?? 0,
      storeLng: settings?.storeLng ?? 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
