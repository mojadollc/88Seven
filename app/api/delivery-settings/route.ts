import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  let settings = await prisma.deliverySettings.findFirst()
  if (!settings) {
    settings = await prisma.deliverySettings.create({ data: {} })
  }
  return NextResponse.json(settings)
}

export async function POST(req: Request) {
  const data = await req.json()
  let settings = await prisma.deliverySettings.findFirst()
  if (settings) {
    settings = await prisma.deliverySettings.update({ where: { id: settings.id }, data })
  } else {
    settings = await prisma.deliverySettings.create({ data })
  }
  return NextResponse.json(settings)
}
