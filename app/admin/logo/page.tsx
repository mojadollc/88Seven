"use client"

import { useEffect, useRef, useState } from "react"

export default function AdminLogoPage() {
  const [logoUrl, setLogoUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch("/api/settings/logo")
      .then(r => r.json())
      .then(d => { setLogoUrl(d.logoUrl ?? ""); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!["image/png", "image/webp"].includes(file.type)) {
      setError("Only PNG and WebP files are allowed."); return
    }
    setError("")
    setUploading(true)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", "logo")
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (data.url) setLogoUrl(data.url)
      else setError("Upload failed")
    } catch { setError("Upload failed") }
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logoUrl }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || "Failed")
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

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
            <h1 className="text-lg font-bold text-gray-900">Logo</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Upload your app logo (PNG or WebP)</p>
          </div>
          <button onClick={handleSave} disabled={saving || !logoUrl} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-700 transition-colors disabled:opacity-50">
            {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</> : saved ? "✓ Saved!" : "Save Logo"}
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </header>

      <div className="p-6 max-w-xl space-y-6">

        {/* Current logo preview */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Preview</h2>
          </div>
          <div className="p-6 flex flex-col items-center gap-4">
            <div className="w-40 h-40 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50 overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-3" />
              ) : (
                <div className="text-center">
                  <p className="text-3xl mb-1">🖼️</p>
                  <p className="text-xs text-gray-400">No logo uploaded</p>
                </div>
              )}
            </div>
            {/* Dark bg preview */}
            {logoUrl && (
              <div className="w-40 h-20 rounded-xl flex items-center justify-center bg-gray-900 overflow-hidden">
                <img src={logoUrl} alt="Logo on dark" className="h-12 object-contain" />
              </div>
            )}
          </div>
        </div>

        {/* Upload */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-sm text-gray-800">Upload</h2>
            <p className="text-[11px] text-gray-400 mt-0.5">Accepted formats: PNG, WebP. Recommended: 512×512px transparent background.</p>
          </div>
          <div className="p-6 space-y-4">
            <input ref={fileRef} type="file" accept=".png,.webp,image/png,image/webp" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400 rounded-xl py-8 flex flex-col items-center gap-2 transition-colors bg-gray-50 hover:bg-gray-100"
            >
              {uploading ? (
                <><div className="w-6 h-6 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /><span className="text-sm text-gray-500">Uploading...</span></>
              ) : (
                <><span className="text-3xl">📤</span><span className="text-sm font-semibold text-gray-600">Click to upload PNG or WebP</span><span className="text-xs text-gray-400">Max 5MB</span></>
              )}
            </button>

            {logoUrl && (
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                <div className="w-10 h-10 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden shrink-0">
                  <img src={logoUrl} alt="logo" className="w-8 h-8 object-contain" />
                </div>
                <p className="text-xs text-gray-500 truncate flex-1 font-mono">{logoUrl}</p>
                <button onClick={() => setLogoUrl("")} className="text-xs text-red-400 font-semibold shrink-0">Remove</button>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  )
}
