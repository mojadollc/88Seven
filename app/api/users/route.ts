import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role")
  const where: any = {}
  if (role) where.role = role
  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, email: true, phone: true, role: true, status: true,
      isOnline: true, lat: true, lng: true, shopName: true, address: true,
      landmark: true, logoUrl: true, walletBalance: true, rating: true,
      completedJobs: true, skills: true, services: true, listingMode: true,
      minimumBalance: true, openTime: true, closeTime: true, openDays: true,
      vehicleType: true, plateNumber: true, profileComplete: true, createdAt: true,
    }
  })
  return NextResponse.json(users)
}
