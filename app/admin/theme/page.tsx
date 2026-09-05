"use client"

import { useEffect, useState } from "react"

const DEFAULTS = { themeType: "solid", themeColor: "#319F44", themeColorTo: "#59EBC6", themeTextColor: "#ffffff", themeBgColor: "#F5F5DB", themeDeliveryBannerColor: "#267a34", themeDeliveryBannerTextColor: "#ffffff", themeFooterBgColor: "#1a1a1a", themeFooterTextColor: "#ffffff" }

const PRESETS = [
  { label: "Green", type: "solid", color: "#319F44", colorTo: "#319F44", text: "#ffffff", bg: "#F5F5DB", banner: "#267a34", bannerText: "#ffffff", footerBg: "#1a1a1a", footerText: "#ffffff" },
  { label: "Teal", type: "solid", color: "#0d9488", colorTo: "#0d9488", text: "#ffffff", bg: "#f0fdfa", banner: "#0f766e", bannerText: "#ffffff", footerBg: "#134e4a", footerText: "#ffffff" },
  { label: "Blue", type: "solid", color: "#1a56db", colorTo: "#1a56db", text: "#ffffff", bg: "#eff6ff", banner: "#1e40af", bannerText: "#ffffff", footerBg: "#1e3a8a", footerText: "#ffffff" },
  { label: "Purple", type: "solid", color: "#7c3aed", colorTo: "#7c3aed", text: "#ffffff", bg: "#faf5ff", banner: "#6d28d9", bannerText: "#ffffff", footerBg: "#4c1d95", footerText: "#ffffff" },
  { label: "Orange", type: "solid", color: "#ea580c", colorTo: "#ea580c", text: "#ffffff", bg: "#fff7ed", banner: "#c2410c", bannerText: "#ffffff", footerBg: "#7c2d12", footerText: "#ffffff" },
  { label: "Rose", type: "solid", color: "#e11d48", colorTo: "#e11d48", text: "#ffffff", bg: "#fff1f2", banner: "#be123c", bannerText: "#ffffff", footerBg: "#881337", footerText: "#ffffff" },
  { label: "Dark", type: "solid", color: "#1F2937", colorTo: "#1F2937", text: "#ffffff", bg: "#f9fafb", banner: "#111827", bannerText: "#ffffff", footerBg: "#030712", footerText: "#ffffff" },
  { label: "Green→Teal", type: "gradient", color: "#319F44", colorTo: "#59EBC6", text: "#ffffff", bg: "#F5F5DB", banner: "#267a34", bannerText: "#ffffff", footerBg: "#1a1a1a", footerText: "#ffffff" },
  { label: "Blue→Purple", type: "gradient", color: "#1a56db", colorTo: "#7c3aed", text: "#ffffff", bg: "#eff6ff", banner: "#1e40af", bannerText: "#ffffff", footerBg: "#1e3a8a", footerText: "#ffffff" },
  { label: "Orange→Red", type: "gradient", color: "#f97316", colorTo: "#e11d48", text: "#ffffff", bg: "#fff7ed", banner: "#c2410c", bannerText: "#ffffff", footerBg: "#7c2d12", footerText: "#ffffff" },
  { label: "Teal→Blue", type: "gradient", color: "#0d9488", colorTo: "#1a56db", text: "#ffffff", bg: "#f0fdfa", banner: "#0f766e", bannerText: "#ffffff", footerBg: "#134e4a", footerText: "#ffffff" },
  { label: "Purple→Pink", type: "gradient", color: "#7c3aed", colorTo: "#ec4899", text: "#ffffff", bg: "#faf5ff", banner: "#6d28d9", bannerText: "#ffffff", footerBg: "#4c1d95", footerText: "#ffffff" },
]

type Theme = { themeType: string; themeColor: string; themeColorTo: string; themeTextColor: string; themeBgColor: string; themeDeliveryBannerColor: string; themeDeliveryBannerTextColor: string; themeFooterBgColor: string; themeFooterTextColor: string }

function applyThemeLive(t: Theme) {
  const root = document.documentElement
  const bg = t.themeType === "gradient"
    ? `linear-gradient(135deg, ${t.themeColor}, ${t.themeColorTo})`
    : t.themeColor
  root.style.setProperty("--theme-color", t.themeColor)
  root.style.setProperty("--theme-color-to", t.themeColorTo)
  root.style.setProperty("--theme-text", t.themeTextColor)
  root.style.setProperty("--theme-bg", bg)
  root.style.setProperty("--theme-page-bg", t.themeBgColor)
  root.style.setProperty("--theme-delivery-banner", t.themeDeliveryBannerColor)
  root.style.setProperty("--theme-delivery-banner-text", t.themeDeliveryBannerTextColor)
  root.style.setProperty("--theme-footer-bg", t.themeFooterBgColor)
  root.style.setProperty("--theme-footer-text", t.themeFooterTextColor)
  root.style.setProperty("--primary", t.themeColor)
  document.body.style.backgroundColor = t.themeBgColor
}

export default function AdminThemePage() {
  const [theme, setTheme] = useState<Theme>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/settings/theme", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setTheme({ ...DEFAULTS, ...d }); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const update = (patch: Partial<Theme>) => {
    const next = { ...theme, ...patch }
    setTheme(next)
    applyThemeLive(next)
  }

  const handleSave = async () => {
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/settings/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
        cache: "no-store",
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Failed")
      applyThemeLive(theme)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) {
      setError(e.message)
    }
    setSaving(false)
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
            <p className="text-[11px] text-gray-400 mt-0.5">Customize colors applied across all app pages</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : saved ? "✓ Saved!" : "Save Theme"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </header>

      <div className="p-6 max-w-3xl space-y-6">

        {/* Live Preview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Live Preview</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Changes apply instantly as you pick colors</p>
          </div>
          <div className="p-6">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-100">
              {/* Mock header */}
              <div className="px-5 py-3.5 flex items-center justify-between" style={bgStyle}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="font-black text-xs" style={{ color: theme.themeTextColor }}>G</span>
                  </div>
                  <span className="font-black text-sm" style={{ color: theme.themeTextColor }}>Gruwcer</span>
                </div>
                <div className="w-20 h-7 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-[10px] font-bold" style={{ color: theme.themeTextColor }}>Account</span>
                </div>
              </div>
              {/* Mock delivery banner */}
              <div className="py-1 text-center" style={{ backgroundColor: theme.themeDeliveryBannerColor }}>
                <span className="text-white text-[10px] font-medium">⚡ Same-Day Delivery — Order before 3:00 PM</span>
              </div>
              <div className="p-4 space-y-3" style={{ backgroundColor: theme.themeBgColor }}>
                <div className="h-20 rounded-xl" style={bgStyle} />
                <div className="grid grid-cols-3 gap-2">
                  {[1,2,3].map(i => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-gray-100 flex flex-col items-center gap-1.5">
                      <div className="w-8 h-8 rounded-lg" style={bgStyle} />
                      <div className="h-2 w-10 bg-gray-100 rounded" />
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
              <button key={t} onClick={() => update({ themeType: t })}
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
          <div className="p-6 space-y-5">

            <ColorRow
              label={theme.themeType === "gradient" ? "From Color" : "Main Color"}
              value={theme.themeColor}
              onChange={v => update({ themeColor: v })}
              preview={<div className="w-10 h-10 rounded-lg border border-gray-100" style={{ background: theme.themeColor }} />}
            />

            {theme.themeType === "gradient" && (
              <ColorRow
                label="To Color"
                value={theme.themeColorTo}
                onChange={v => update({ themeColorTo: v })}
                preview={<div className="w-10 h-10 rounded-lg border border-gray-100" style={{ background: theme.themeColorTo }} />}
              />
            )}

            <ColorRow
              label="Text Color"
              value={theme.themeTextColor}
              onChange={v => update({ themeTextColor: v })}
              preview={
                <div className="w-10 h-10 rounded-lg border border-gray-100 flex items-center justify-center text-xs font-bold" style={{ background: theme.themeColor, color: theme.themeTextColor }}>Aa</div>
              }
            />

            <ColorRow
              label="Page Background"
              value={theme.themeBgColor}
              onChange={v => update({ themeBgColor: v })}
              preview={<div className="w-10 h-10 rounded-lg border border-gray-200" style={{ background: theme.themeBgColor }} />}
            />

            <ColorRow
              label="Delivery Banner"
              value={theme.themeDeliveryBannerColor}
              onChange={v => update({ themeDeliveryBannerColor: v })}
              preview={
                <div className="h-10 flex-1 rounded-lg flex items-center justify-center text-[10px] font-medium" style={{ background: theme.themeDeliveryBannerColor, color: theme.themeDeliveryBannerTextColor }}>
                  ⚡ Same-Day Delivery
                </div>
              }
            />

            <ColorRow
              label="Banner Text"
              value={theme.themeDeliveryBannerTextColor}
              onChange={v => update({ themeDeliveryBannerTextColor: v })}
              preview={
                <div className="h-10 flex-1 rounded-lg flex items-center justify-center text-[10px] font-medium" style={{ background: theme.themeDeliveryBannerColor, color: theme.themeDeliveryBannerTextColor }}>
                  ⚡ Same-Day Delivery
                </div>
              }
            />

            <ColorRow
              label="Footer BG"
              value={theme.themeFooterBgColor}
              onChange={v => update({ themeFooterBgColor: v })}
              preview={
                <div className="h-10 flex-1 rounded-lg flex items-center justify-center text-[10px] font-medium" style={{ background: theme.themeFooterBgColor, color: theme.themeFooterTextColor }}>
                  © Gruwcer
                </div>
              }
            />

            <ColorRow
              label="Footer Text"
              value={theme.themeFooterTextColor}
              onChange={v => update({ themeFooterTextColor: v })}
              preview={
                <div className="h-10 flex-1 rounded-lg flex items-center justify-center text-[10px] font-medium" style={{ background: theme.themeFooterBgColor, color: theme.themeFooterTextColor }}>
                  © Gruwcer
                </div>
              }
            />

          </div>
        </div>

        {/* Presets */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Presets</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Click to apply instantly</p>
          </div>
          <div className="p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {PRESETS.map(p => {
              const isActive = theme.themeColor === p.color && theme.themeColorTo === p.colorTo && theme.themeType === p.type
              const style = p.type === "gradient"
                ? { background: `linear-gradient(135deg, ${p.color}, ${p.colorTo})` }
                : { background: p.color }
              return (
                <button key={p.label}
                  onClick={() => update({ themeType: p.type, themeColor: p.color, themeColorTo: p.colorTo, themeTextColor: p.text, themeBgColor: p.bg, themeDeliveryBannerColor: p.banner, themeDeliveryBannerTextColor: p.bannerText, themeFooterBgColor: p.footerBg, themeFooterTextColor: p.footerText })}
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

function ColorRow({ label, value, onChange, preview }: { label: string; value: string; onChange: (v: string) => void; preview: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide w-32 shrink-0">{label}</label>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5" />
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono w-28 outline-none focus:border-gray-400" />
        {preview}
      </div>
    </div>
  )
}
