import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET!

export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { id } = jwt.verify(token, JWT_SECRET) as { id: string }
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 })
    const { passwordHash: _, ...safe } = user
    return NextResponse.json(safe)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "")
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  try {
    const { id } = jwt.verify(token, JWT_SECRET) as { id: string }
    const data = await req.json()
    const { passwordHash: _, id: __, ...allowed } = data
    const user = await prisma.user.update({ where: { id }, data: allowed })
    const { passwordHash: _h, ...safe } = user
    return NextResponse.json(safe)
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
}
