"use client"

import { useEffect, useState, useRef } from "react"

const SERVICES = [
  { id: "grocery", label: "Grocery", link: "/grocery", color: "from-[#4194AF] via-[#61B288] to-[#93D569]", icon: "🛒" },
  { id: "laundry", label: "Laundry", link: "/laundry", color: "from-blue-500 to-indigo-600", icon: "👕" },
  { id: "services", label: "Home Services", link: "/home-services", color: "from-teal-500 to-cyan-600", icon: "🔧" },
  { id: "travel", label: "Hotel & Flights", link: "/travel", color: "from-sky-500 to-blue-600", icon: "✈️" },
  { id: "food", label: "Food To Go", link: "/food", color: "from-orange-500 to-red-500", icon: "🍔" },
  { id: "bills", label: "Bills Payment", link: "/bills", color: "from-purple-500 to-violet-600", icon: "💳" },
]

export default function HeroImagesAdmin() {
  const [slides, setSlides] = useState<Record<string, any>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    fetch("/api/hero?all=true").then(r => r.json()).then((data: any[]) => {
      const map: Record<string, any> = {}
      const urlMap: Record<string, string> = {}
      data.forEach(s => {
        const svc = SERVICES.find(x => x.link === s.link)
        if (svc) { map[svc.id] = s; urlMap[svc.id] = s.imageUrl || "" }
      })
      setSlides(map)
      setUrls(urlMap)
    })
  }, [])

  async function handleUpload(serviceId: string, file: File) {
    setUploading(serviceId)
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", "hero")
    const res = await fetch("/api/upload", { method: "POST", body: fd })
    const { url } = await res.json()
    setUrls(p => ({ ...p, [serviceId]: url }))
    setUploading(null)
  }

  async function handleSave(serviceId: string) {
    const svc = SERVICES.find(x => x.id === serviceId)!
    const imageUrl = urls[serviceId] || ""
    setSaving(serviceId)
    const existing = slides[serviceId]
    if (existing) {
      await fetch(`/api/hero/${existing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl }) })
      setSlides(p => ({ ...p, [serviceId]: { ...existing, imageUrl } }))
    } else {
      const res = await fetch("/api/hero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ badge: svc.label, title: svc.label, highlight: "", description: "", imageUrl, bgColor: "#4194AF", link: svc.link, order: 0, enabled: true }) })
      const created = await res.json()
      setSlides(p => ({ ...p, [serviceId]: created }))
    }
    setSaving(null)
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <h1 className="text-lg font-bold text-[#1F2937]">Hero Section Images</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage the images shown on the right side of the homepage hero</p>
        <div className="mt-2 inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
          <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span className="text-xs text-blue-600 font-medium">Recommended image size: <strong>900 × 700 px</strong> — Portrait or square works best. Min width 600px.</span>
        </div>
      </header>

      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map(svc => {
          const currentImage = urls[svc.id] || ""
          const isUploading = uploading === svc.id
          const isSaving = saving === svc.id

          return (
            <div key={svc.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Preview */}
              <div className={`relative h-40 bg-gradient-to-br ${svc.color} flex items-center justify-center`}>
                {currentImage
                  ? <img src={currentImage} alt={svc.label} className="w-full h-full object-cover" />
                  : <span className="text-5xl opacity-60">{svc.icon}</span>
                }
                {currentImage && (
                  <button onClick={() => setUrls(p => ({ ...p, [svc.id]: "" }))}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                )}
              </div>

              <div className="p-4 space-y-3">
                <p className="font-bold text-sm text-gray-800">{svc.icon} {svc.label}</p>

                <input ref={el => { fileRefs.current[svc.id] = el }} type="file" accept="image/*" className="hidden"
                  onChange={e => { if (e.target.files?.[0]) handleUpload(svc.id, e.target.files[0]) }} />

                <button onClick={() => fileRefs.current[svc.id]?.click()} disabled={isUploading}
                  className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#4194AF] rounded-lg py-2 text-sm text-gray-500 hover:text-[#4194AF] transition-colors disabled:opacity-50">
                  {isUploading ? "Uploading..." : "📁 Upload Image"}
                </button>
                <p className="text-[10px] text-gray-400 text-center -mt-1">Recommended: 900 × 700px • JPG or PNG</p>

                <input type="text" value={currentImage} onChange={e => setUrls(p => ({ ...p, [svc.id]: e.target.value }))}
                  placeholder="Or paste image URL..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-[#4194AF]" />

                <button onClick={() => handleSave(svc.id)} disabled={isSaving}
                  className="w-full bg-[#4194AF] text-white text-sm font-semibold py-2 rounded-lg hover:bg-[#3a7d96] disabled:opacity-50 transition-colors">
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}
