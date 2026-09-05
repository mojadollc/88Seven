import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import path from "path"

const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg",
  png: "image/png", webp: "image/webp",
  gif: "image/gif", svg: "image/svg+xml",
  pdf: "application/pdf",
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path: segments } = await params
    // Prevent path traversal
    const safe = segments.map(s => s.replace(/\.\./g, "")).filter(Boolean)
    const filePath = path.join(process.cwd(), "public", "uploads", ...safe)
    const buffer = await readFile(filePath)
    const ext = safe[safe.length - 1]?.split(".").pop()?.toLowerCase() ?? ""
    const contentType = MIME[ext] ?? "application/octet-stream"
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    })
  } catch {
    return new NextResponse("Not found", { status: 404 })
  }
}
