"use client"

import { useEffect, useState } from "react"
// All data via Postgres API

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  reviewed: "bg-blue-100 text-blue-800",
  resolved: "bg-[#93D569]/20 text-green-800",
}

export default function AdminReportsPage() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "pending" | "reviewed" | "resolved">("all")

  useEffect(() => { loadReports() }, [])

  const loadReports = async () => {
    setLoading(true)
    const res = await fetch("/api/admin/reports")
    const data = res.ok ? await res.json() : []
    setReports(data)
    setLoading(false)
  }

  const handleStatus = async (id: string, status: "pending" | "reviewed" | "resolved") => {
    await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, status }) })
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
  }

  const filtered = filter === "all" ? reports : reports.filter((r) => r.status === filter)

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1F2937]">Customer Reports</h1>
          <button onClick={loadReports} className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium">↻ Refresh</button>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-yellow-600">{reports.filter((r) => r.status === "pending").length}</p>
            <p className="text-xs text-gray-400">Pending</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-blue-600">{reports.filter((r) => r.status === "reviewed").length}</p>
            <p className="text-xs text-gray-400">Reviewed</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-bold text-[#4194AF]">{reports.filter((r) => r.status === "resolved").length}</p>
            <p className="text-xs text-gray-400">Resolved</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-4">
          {(["all", "pending", "reviewed", "resolved"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 text-xs rounded-lg capitalize font-medium transition-colors ${
                filter === s ? "bg-[#4194AF] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Reports List */}
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading reports...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-400 text-sm">No reports</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((report) => (
              <div key={report.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${STATUS_COLORS[report.status]}`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-gray-400 capitalize">
                      {report.type === "rider" && "🏍️ "}
                      {report.type === "order" && "📦 "}
                      {report.type === "product" && "🛒 "}
                      {report.type === "other" && "❓ "}
                      {report.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400">{report.createdAt?.toLocaleDateString?.() || ""}</span>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-sm text-gray-800 mb-1">{report.subject}</h3>
                  <p className="text-sm text-gray-600 mb-3">{report.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-3">
                    <span>👤 {report.customerName}</span>
                    {report.orderId && <span>📦 Order #{report.orderId.slice(0, 8)}</span>}
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {report.status === "pending" && (
                      <button onClick={() => handleStatus(report.id, "reviewed")} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-600">
                        Mark Reviewed
                      </button>
                    )}
                    {report.status !== "resolved" && (
                      <button onClick={() => handleStatus(report.id, "resolved")} className="text-xs bg-[#4194AF]/100 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-green-600">
                        ✓ Resolve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
