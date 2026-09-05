import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const KEY = "global"

const DEFAULTS = {
  themeType: "solid",
  themeColor: "#319F44",
  themeColorTo: "#59EBC6",
  themeTextColor: "#ffffff",
  themeBgColor: "#F5F5DB",
}

export async function GET() {
  try {
    const row = await (prisma as any).appSettings.findUnique({ where: { key: KEY } })
    return NextResponse.json({
      themeType: row?.themeType ?? DEFAULTS.themeType,
      themeColor: row?.themeColor ?? DEFAULTS.themeColor,
      themeColorTo: row?.themeColorTo ?? DEFAULTS.themeColorTo,
      themeTextColor: row?.themeTextColor ?? DEFAULTS.themeTextColor,
      themeBgColor: row?.themeBgColor ?? DEFAULTS.themeBgColor,
    })
  } catch {
    return NextResponse.json(DEFAULTS)
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    await (prisma as any).appSettings.upsert({
      where: { key: KEY },
      update: {
        themeType: body.themeType,
        themeColor: body.themeColor,
        themeColorTo: body.themeColorTo,
        themeTextColor: body.themeTextColor,
        themeBgColor: body.themeBgColor,
      },
      create: {
        key: KEY,
        themeType: body.themeType ?? DEFAULTS.themeType,
        themeColor: body.themeColor ?? DEFAULTS.themeColor,
        themeColorTo: body.themeColorTo ?? DEFAULTS.themeColorTo,
        themeTextColor: body.themeTextColor ?? DEFAULTS.themeTextColor,
        themeBgColor: body.themeBgColor ?? DEFAULTS.themeBgColor,
      },
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
