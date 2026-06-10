"use client"

import { useEffect, useState } from "react"
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, orderBy, query } from "firebase/firestore"

const db = getFirestore()

type HeroSlide = {
  id: string
  title: string
  subtitle: string
  bg: string
  cta: string
  ctaLink: string
  icon: string
  order: number
  enabled: boolean
}

type ServiceProvider = {
  id: string
  name: string
  phone: string
  skills: string[]
  bio: string
  rating: number
  completedJobs: number
  photoUrl: string
  available: boolean
}

export default function AdminHomeServicesPage() {
  const [tab, setTab] = useState<"sliders" | "providers">("sliders")

  // Sliders
  const [slides, setSlides] = useState<HeroSlide[]>([])
  const [showSlideForm, setShowSlideForm] = useState(false)
  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null)
  const [slideForm, setSlideForm] = useState({ title: "", subtitle: "", bg: "from-teal-600 to-emerald-700", cta: "Book Now", ctaLink: "/services", icon: "🛠️", order: 0, enabled: true })

  // Providers
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [showProviderForm, setShowProviderForm] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ServiceProvider | null>(null)
  const [providerForm, setProviderForm] = useState({ name: "", phone: "", skills: "", bio: "", rating: 0, completedJobs: 0, photoUrl: "", available: true })

  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    const [slidesSnap, providersSnap] = await Promise.all([
      getDocs(query(collection(db, "homeServiceSlides"), orderBy("order"))),
      getDocs(collection(db, "serviceProviders")),
    ])
    setSlides(slidesSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as HeroSlide))
    setProviders(providersSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as ServiceProvider))
    setLoading(false)
  }

  // Slide CRUD
  const saveSlide = async () => {
    if (!slideForm.title) return
    if (editingSlide) {
      await updateDoc(doc(db, "homeServiceSlides", editingSlide.id), slideForm)
    } else {
      await addDoc(collection(db, "homeServiceSlides"), slideForm)
    }
    setShowSlideForm(false)
    setEditingSlide(null)
    setSlideForm({ title: "", subtitle: "", bg: "from-teal-600 to-emerald-700", cta: "Book Now", ctaLink: "/services", icon: "🛠️", order: 0, enabled: true })
    await loadAll()
  }

  const editSlide = (s: HeroSlide) => {
    setEditingSlide(s)
    setSlideForm({ title: s.title, subtitle: s.subtitle, bg: s.bg, cta: s.cta, ctaLink: s.ctaLink, icon: s.icon, order: s.order, enabled: s.enabled })
    setShowSlideForm(true)
  }

  const deleteSlide = async (id: string) => {
    if (!confirm("Delete this slide?")) return
    await deleteDoc(doc(db, "homeServiceSlides", id))
    await loadAll()
  }

  const toggleSlide = async (s: HeroSlide) => {
    await updateDoc(doc(db, "homeServiceSlides", s.id), { enabled: !s.enabled })
    setSlides((prev) => prev.map((x) => x.id === s.id ? { ...x, enabled: !x.enabled } : x))
  }

  // Provider CRUD
  const saveProvider = async () => {
    if (!providerForm.name || !providerForm.phone) return
    const data = { ...providerForm, skills: providerForm.skills.split(",").map((s) => s.trim()).filter(Boolean) }
    if (editingProvider) {
      await updateDoc(doc(db, "serviceProviders", editingProvider.id), data)
    } else {
      await addDoc(collection(db, "serviceProviders"), data)
    }
    setShowProviderForm(false)
    setEditingProvider(null)
    setProviderForm({ name: "", phone: "", skills: "", bio: "", rating: 0, completedJobs: 0, photoUrl: "", available: true })
    await loadAll()
  }

  const editProvider = (p: ServiceProvider) => {
    setEditingProvider(p)
    setProviderForm({ name: p.name, phone: p.phone, skills: p.skills.join(", "), bio: p.bio, rating: p.rating, completedJobs: p.completedJobs, photoUrl: p.photoUrl, available: p.available })
    setShowProviderForm(true)
  }

  const deleteProvider = async (id: string) => {
    if (!confirm("Delete this provider?")) return
    await deleteDoc(doc(db, "serviceProviders", id))
    await loadAll()
  }

  const toggleProvider = async (p: ServiceProvider) => {
    await updateDoc(doc(db, "serviceProviders", p.id), { available: !p.available })
    setProviders((prev) => prev.map((x) => x.id === p.id ? { ...x, available: !x.available } : x))
  }

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-[#1a1a2e]">Home Services</h1>
          <button
            onClick={() => tab === "sliders" ? (() => { setEditingSlide(null); setSlideForm({ title: "", subtitle: "", bg: "from-teal-600 to-emerald-700", cta: "Book Now", ctaLink: "/services", icon: "🛠️", order: slides.length + 1, enabled: true }); setShowSlideForm(true) })() : (() => { setEditingProvider(null); setProviderForm({ name: "", phone: "", skills: "", bio: "", rating: 0, completedJobs: 0, photoUrl: "", available: true }); setShowProviderForm(true) })()}
            className="text-xs bg-[#D62828] text-white px-4 py-2 rounded-lg font-bold"
          >
            + Add {tab === "sliders" ? "Slide" : "Provider"}
          </button>
        </div>
      </header>

      <div className="p-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setTab("sliders")} className={`px-5 py-2.5 text-sm rounded-lg font-medium transition-colors ${tab === "sliders" ? "bg-[#D62828] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            Banner Sliders
          </button>
          <button onClick={() => setTab("providers")} className={`px-5 py-2.5 text-sm rounded-lg font-medium transition-colors ${tab === "providers" ? "bg-[#D62828] text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
            Service Providers
          </button>
        </div>

        {loading && <div className="text-center py-10 text-gray-400">Loading...</div>}

        {/* SLIDERS TAB */}
        {!loading && tab === "sliders" && (
          <div className="space-y-3">
            {slides.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <p className="text-gray-400 text-sm">No slides yet</p>
                <p className="text-xs text-gray-300 mt-1">Add hero slides for the Home Services page</p>
              </div>
            ) : slides.map((slide) => (
              <div key={slide.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${!slide.enabled ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{slide.icon}</span>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{slide.title}</p>
                      <p className="text-xs text-gray-400 italic">{slide.subtitle}</p>
                      <p className="text-[10px] text-gray-300 mt-0.5">CTA: {slide.cta} → {slide.ctaLink}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSlide(slide)} className={`w-10 h-5 rounded-full relative transition-colors ${slide.enabled ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${slide.enabled ? "translate-x-5" : ""}`} />
                    </button>
                    <button onClick={() => editSlide(slide)} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Edit</button>
                    <button onClick={() => deleteSlide(slide.id)} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PROVIDERS TAB */}
        {!loading && tab === "providers" && (
          <div className="space-y-3">
            {providers.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
                <p className="text-gray-400 text-sm">No service providers yet</p>
                <p className="text-xs text-gray-300 mt-1">Add providers who offer home services</p>
              </div>
            ) : providers.map((p) => (
              <div key={p.id} className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 ${!p.available ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center overflow-hidden">
                      {p.photoUrl ? <img src={p.photoUrl} className="w-full h-full object-cover" /> : <span className="text-lg">👷</span>}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-800">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.phone}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.skills.map((s) => <span key={s} className="text-[9px] bg-teal-50 text-teal-700 px-1.5 py-0.5 rounded">{s}</span>)}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {p.rating > 0 && <span className="text-[10px] text-yellow-600">⭐ {p.rating}</span>}
                        {p.completedJobs > 0 && <span className="text-[10px] text-gray-400">{p.completedJobs} jobs</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleProvider(p)} className={`w-10 h-5 rounded-full relative transition-colors ${p.available ? "bg-green-500" : "bg-gray-300"}`}>
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${p.available ? "translate-x-5" : ""}`} />
                    </button>
                    <button onClick={() => editProvider(p)} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">Edit</button>
                    <button onClick={() => deleteProvider(p.id)} className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold">Del</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SLIDE FORM MODAL */}
      {showSlideForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSlideForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-600 px-6 py-4">
              <h2 className="font-bold text-lg text-white">{editingSlide ? "Edit Slide" : "Add Slide"}</h2>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                <input value={slideForm.title} onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })} placeholder="Earn your spare time using your skills" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Subtitle</label>
                <input value={slideForm.subtitle} onChange={(e) => setSlideForm({ ...slideForm, subtitle: e.target.value })} placeholder="Kumita sa imong bakanteng oras..." className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Icon (emoji)</label>
                  <input value={slideForm.icon} onChange={(e) => setSlideForm({ ...slideForm, icon: e.target.value })} placeholder="💪" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Order</label>
                  <input type="number" value={slideForm.order} onChange={(e) => setSlideForm({ ...slideForm, order: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Gradient Background</label>
                <select value={slideForm.bg} onChange={(e) => setSlideForm({ ...slideForm, bg: e.target.value })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600">
                  <option value="from-teal-600 to-emerald-700">Teal → Emerald</option>
                  <option value="from-blue-600 to-indigo-700">Blue → Indigo</option>
                  <option value="from-orange-500 to-red-600">Orange → Red</option>
                  <option value="from-purple-600 to-pink-600">Purple → Pink</option>
                  <option value="from-green-600 to-teal-700">Green → Teal</option>
                  <option value="from-gray-800 to-gray-900">Dark</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">CTA Text</label>
                  <input value={slideForm.cta} onChange={(e) => setSlideForm({ ...slideForm, cta: e.target.value })} placeholder="Book Now" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">CTA Link</label>
                  <input value={slideForm.ctaLink} onChange={(e) => setSlideForm({ ...slideForm, ctaLink: e.target.value })} placeholder="/services" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowSlideForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={saveSlide} disabled={!slideForm.title} className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROVIDER FORM MODAL */}
      {showProviderForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowProviderForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md overflow-hidden">
            <div className="bg-teal-600 px-6 py-4">
              <h2 className="font-bold text-lg text-white">{editingProvider ? "Edit Provider" : "Add Provider"}</h2>
            </div>
            <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                <input value={providerForm.name} onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })} placeholder="Juan Dela Cruz" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                <input value={providerForm.phone} onChange={(e) => setProviderForm({ ...providerForm, phone: e.target.value })} placeholder="09xxxxxxxxx" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Skills (comma separated)</label>
                <input value={providerForm.skills} onChange={(e) => setProviderForm({ ...providerForm, skills: e.target.value })} placeholder="Aircon, Plumbing, Electrical" className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Bio</label>
                <textarea value={providerForm.bio} onChange={(e) => setProviderForm({ ...providerForm, bio: e.target.value })} placeholder="5 years experience..." rows={2} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600 resize-none" />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Photo URL</label>
                <input value={providerForm.photoUrl} onChange={(e) => setProviderForm({ ...providerForm, photoUrl: e.target.value })} placeholder="https://..." className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Rating (0-5)</label>
                  <input type="number" min={0} max={5} step={0.1} value={providerForm.rating || ""} onChange={(e) => setProviderForm({ ...providerForm, rating: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Jobs Done</label>
                  <input type="number" min={0} value={providerForm.completedJobs || ""} onChange={(e) => setProviderForm({ ...providerForm, completedJobs: Number(e.target.value) })} className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm mt-1 outline-none focus:border-teal-600" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-xs font-semibold text-gray-500 uppercase">Available</label>
                <button onClick={() => setProviderForm({ ...providerForm, available: !providerForm.available })} className={`w-10 h-5 rounded-full relative transition-colors ${providerForm.available ? "bg-green-500" : "bg-gray-300"}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${providerForm.available ? "translate-x-5" : ""}`} />
                </button>
              </div>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowProviderForm(false)} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm font-medium">Cancel</button>
                <button onClick={saveProvider} disabled={!providerForm.name || !providerForm.phone} className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-sm font-bold disabled:opacity-40">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
