"use client"

import { useEffect, useState } from "react"

export default function AdminSearchLogs() {
  const [data, setData] = useState<{ query: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/search-logs?limit=30")
      .then(r => r.json())
      .then(d => { setData(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const max = data[0]?.count || 1

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <h1 className="text-lg font-bold text-[#1F2937]">Search Analytics</h1>
        <p className="text-xs text-gray-400 mt-0.5">What customers are searching for in the grocery store</p>
      </header>

      <div className="p-6 space-y-6">
        {/* Top 3 highlight */}
        {!loading && data.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.slice(0, 3).map((item, i) => {
              const medals = ["🥇", "🥈", "🥉"]
              const colors = ["bg-yellow-50 border-yellow-200", "bg-gray-50 border-gray-200", "bg-orange-50 border-orange-200"]
              const textColors = ["text-yellow-700", "text-gray-600", "text-orange-700"]
              return (
                <div key={item.query} className={`rounded-xl border p-4 ${colors[i]}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{medals[i]}</span>
                    <span className={`text-xs font-bold uppercase tracking-wide ${textColors[i]}`}>#{i + 1} Most Searched</span>
                  </div>
                  <p className="font-black text-xl text-gray-900 capitalize mt-1">{item.query}</p>
                  <p className={`text-sm font-semibold mt-1 ${textColors[i]}`}>{item.count} search{item.count !== 1 ? "es" : ""}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Full list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-bold text-gray-800">All Search Terms</span>
            <span className="text-xs text-gray-400">{data.length} unique terms</span>
          </div>
          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading...</div>
          ) : data.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No searches recorded yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.map((item, i) => (
                <div key={item.query} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-xs text-gray-400 w-6 text-right shrink-0">#{i + 1}</span>
                  <span className="text-sm font-medium text-gray-800 capitalize w-40 shrink-0">{item.query}</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#319F44] rounded-full transition-all"
                      style={{ width: `${(item.count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-bold text-gray-700 w-16 text-right shrink-0">{item.count}×</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
