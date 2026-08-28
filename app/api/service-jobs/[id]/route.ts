import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const job = await prisma.serviceJob.update({ where: { id }, data })
  return NextResponse.json(job)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const data = await req.json()
  const job = await prisma.serviceJob.create({ data: { ...data, id: undefined } })
  return NextResponse.json(job)
}
