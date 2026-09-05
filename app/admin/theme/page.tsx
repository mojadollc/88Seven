"use client"

import { useEffect, useState } from "react"

const PRESETS = [
  { label: "Green", type: "solid", color: "#319F44", colorTo: "#319F44", text: "#ffffff" },
  { label: "Teal", type: "solid", color: "#0d9488", colorTo: "#0d9488", text: "#ffffff" },
  { label: "Blue", type: "solid", color: "#1a56db", colorTo: "#1a56db", text: "#ffffff" },
  { label: "Purple", type: "solid", color: "#7c3aed", colorTo: "#7c3aed", text: "#ffffff" },
  { label: "Orange", type: "solid", color: "#ea580c", colorTo: "#ea580c", text: "#ffffff" },
  { label: "Rose", type: "solid", color: "#e11d48", colorTo: "#e11d48", text: "#ffffff" },
  { label: "Dark", type: "solid", color: "#1F2937", colorTo: "#1F2937", text: "#ffffff" },
  { label: "Green→Teal", type: "gradient", color: "#319F44", colorTo: "#59EBC6", text: "#ffffff" },
  { label: "Blue→Purple", type: "gradient", color: "#1a56db", colorTo: "#7c3aed", text: "#ffffff" },
  { label: "Orange→Red", type: "gradient", color: "#f97316", colorTo: "#e11d48", text: "#ffffff" },
  { label: "Teal→Blue", type: "gradient", color: "#0d9488", colorTo: "#1a56db", text: "#ffffff" },
  { label: "Purple→Pink", type: "gradient", color: "#7c3aed", colorTo: "#ec4899", text: "#ffffff" },
]

export default function AdminThemePage() {
  const [theme, setTheme] = useState({ themeType: "solid", themeColor: "#319F44", themeColorTo: "#59EBC6", themeTextColor: "#ffffff" })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    fetch("/api/settings/theme").then(r => r.json()).then(d => { setTheme(d); setLoading(false) })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch("/api/settings/theme", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(theme) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const bgStyle = theme.themeType === "gradient"
    ? { background: `linear-gradient(135deg, ${theme.themeColor}, ${theme.themeColorTo})` }
    : { background: theme.themeColor }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Theme</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Customize the color theme applied across all app pages</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : saved ? "✓ Saved!" : "Save Theme"}
          </button>
        </div>
      </header>

      <div className="p-6 max-w-3xl space-y-6">

        {/* Live Preview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Live Preview</h2>
          </div>
          <div className="p-6">
            <div className="rounded-2xl overflow-hidden shadow-lg">
              {/* Mock header */}
              <div className="px-5 py-3.5 flex items-center justify-between" style={bgStyle}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="font-black text-xs" style={{ color: theme.themeTextColor }}>G</span>
                  </div>
                  <span className="font-black text-sm" style={{ color: theme.themeTextColor }}>Gruwcer</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 bg-white/20 rounded-full" />
                  <div className="w-16 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-[10px] font-bold" style={{ color: theme.themeTextColor }}>Account</span>
                  </div>
                </div>
              </div>
              {/* Mock content */}
              <div className="bg-gray-50 p-4 space-y-3">
                <div className="h-24 rounded-xl" style={bgStyle} />
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-lg" style={bgStyle} />
                      <div className="h-2 w-12 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
                <div className="h-10 rounded-xl flex items-center justify-center" style={bgStyle}>
                  <span className="text-xs font-bold" style={{ color: theme.themeTextColor }}>Order Now →</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Type Toggle */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Color Type</h2>
          </div>
          <div className="p-6 flex gap-3">
            {(["solid", "gradient"] as const).map(t => (
              <button key={t} onClick={() => setTheme(p => ({ ...p, themeType: t }))}
                className={`flex-1 py-3 rounded-xl border-2 text-sm font-bold transition-all capitalize ${theme.themeType === t ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                {t === "solid" ? "⬛ Solid" : "🌈 Gradient"}
              </button>
            ))}
          </div>
        </div>

        {/* Color Pickers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Colors</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">
                {theme.themeType === "gradient" ? "From Color" : "Main Color"}
              </label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.themeColor} onChange={e => setTheme(p => ({ ...p, themeColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <input type="text" value={theme.themeColor} onChange={e => setTheme(p => ({ ...p, themeColor: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono w-28 outline-none focus:border-gray-400" />
                <div className="w-10 h-10 rounded-lg border border-gray-100" style={{ background: theme.themeColor }} />
              </div>
            </div>

            {theme.themeType === "gradient" && (
              <div className="flex items-center gap-4">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">To Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={theme.themeColorTo} onChange={e => setTheme(p => ({ ...p, themeColorTo: e.target.value }))}
                    className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                  <input type="text" value={theme.themeColorTo} onChange={e => setTheme(p => ({ ...p, themeColorTo: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono w-28 outline-none focus:border-gray-400" />
                  <div className="w-10 h-10 rounded-lg border border-gray-100" style={{ background: theme.themeColorTo }} />
                </div>
              </div>
            )}

            <div className="flex items-center gap-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Text Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={theme.themeTextColor} onChange={e => setTheme(p => ({ ...p, themeTextColor: e.target.value }))}
                  className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
                <input type="text" value={theme.themeTextColor} onChange={e => setTheme(p => ({ ...p, themeTextColor: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono w-28 outline-none focus:border-gray-400" />
                <div className="w-10 h-10 rounded-lg border border-gray-100 flex items-center justify-center text-xs font-bold" style={{ background: theme.themeColor, color: theme.themeTextColor }}>Aa</div>
              </div>
            </div>
          </div>
        </div>

        {/* Presets */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Presets</h2>
          </div>
          <div className="p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {PRESETS.map(p => {
              const isActive = theme.themeColor === p.color && theme.themeColorTo === p.colorTo && theme.themeType === p.type
              const style = p.type === "gradient"
                ? { background: `linear-gradient(135deg, ${p.color}, ${p.colorTo})` }
                : { background: p.color }
              return (
                <button key={p.label} onClick={() => setTheme({ themeType: p.type, themeColor: p.color, themeColorTo: p.colorTo, themeTextColor: p.text })}
                  className={`flex flex-col items-center gap-2 p-2 rounded-xl border-2 transition-all ${isActive ? "border-gray-900 shadow-md" : "border-transparent hover:border-gray-200"}`}>
                  <div className="w-10 h-10 rounded-lg shadow-sm" style={style} />
                  <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

      </div>
    </>
  )
}
