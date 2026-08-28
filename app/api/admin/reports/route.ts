import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const reports = await prisma.report.findMany({ orderBy: { createdAt: "desc" } })
  return NextResponse.json(reports)
}

export async function PATCH(req: NextRequest) {
  const { id, status } = await req.json()
  const report = await prisma.report.update({ where: { id }, data: { status } })
  return NextResponse.json(report)
}
