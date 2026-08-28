import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const providerId = req.nextUrl.searchParams.get("providerId")
  const customerId = req.nextUrl.searchParams.get("customerId")
  const where: any = {}
  if (providerId) where.providerId = providerId
  if (customerId) where.customerId = customerId
  const jobs = await prisma.serviceJob.findMany({ where, orderBy: { createdAt: "desc" } })
  return NextResponse.json(jobs)
}
