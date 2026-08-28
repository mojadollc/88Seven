"use client"

import { useEffect, useState } from "react"
// Firebase auth removed


type ServiceProvider = {
  id: string
  name: string
  phone: string
  skills: string[]
  bio: string
  rating: number
  completedJobs: number
  photoUrl?: string
  available: boolean
  lat?: number
  lng?: number
}

const FALLBACK_SLIDES = [
  {
    title: "Earn your spare time using your skills",
    subtitle: "Kumita sa imong bakanteng oras gamit ang imong skills",
    bg: "from-teal-600 to-emerald-700",
    cta: "Become a Provider",
    ctaLink: "/auth?tab=provider",
    icon: "💪",
  },
  {
    title: "Book trusted pros for your home",
    subtitle: "Aircon, plumbing, electrical, cleaning & more",
    bg: "from-blue-600 to-indigo-700",
    cta: "Book Now",
    ctaLink: "#services",
    icon: "🏠",
  },
  {
    title: "Affordable & Reliable",
    subtitle: "Maayo ug presyo, kasaligan pa — local experts near you",
    bg: "from-orange-500 to-green-700",
    cta: "See Services",
    ctaLink: "#services",
    icon: "⭐",
  },
]

const SERVICE_CATEGORIES = [
  { id: "aircon", name: "Aircon", icon: "❄️", color: "bg-cyan-50 text-cyan-700" },
  { id: "plumbing", name: "Plumbing", icon: "🔧", color: "bg-blue-50 text-blue-700" },
  { id: "electrical", name: "Electrical", icon: "⚡", color: "bg-yellow-50 text-yellow-700" },
  { id: "cleaning", name: "Cleaning", icon: "🧹", color: "bg-green-50 text-green-700" },
  { id: "carpentry", name: "Carpentry", icon: "🪚", color: "bg-amber-50 text-amber-700" },
  { id: "painting", name: "Painting", icon: "🎨", color: "bg-purple-50 text-purple-700" },
]

export default function HomeServicesPage() {
  const [user, setUser] = useState<any>(null)
  const [providers, setProviders] = useState<ServiceProvider[]>([])
  const [heroSlides, setHeroSlides] = useState<typeof FALLBACK_SLIDES>(FALLBACK_SLIDES)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  useEffect(() => {
    const u = typeof window !== "undefined" ? JSON.parse(localStorage.getItem("user") || "null") : null; setUser(u)
    // no unsub needed
  }, [])

  // Load service providers and slides
  useEffect(() => {
    fetch("/api/users?role=provider").then(r=>r.json()).then((p:any[])=>setProviders(p.filter(x=>x.status==="active")))
    fetch("/api/hero").then(r=>r.json()).then((slides:any[])=>{ if(slides.length>0) setHeroSlides(slides) })
  }, [])

  // Auto-slide
  useEffect(() => {
    const t = setInterval(() => setCurrentSlide((c) => (c + 1) % heroSlides.length), 5000)
    return () => clearInterval(t)
  }, [heroSlides.length])

  const filteredProviders = selectedCategory
    ? providers.filter((p) => p.skills.some((s) => s.toLowerCase().includes(selectedCategory)))
    : providers

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-teal-600 text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <span className="font-bold text-sm">Home</span>
          </a>
          <h1 className="font-bold text-sm">Home Services</h1>
          <a href="/services" className="text-xs text-white/70 hover:text-white">Book</a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto pb-20">
        {/* Hero Slider */}
        <div className="px-4 pt-4">
          <div className={`relative rounded-2xl overflow-hidden bg-gradient-to-br ${heroSlides[currentSlide].bg} p-6 md:p-10 min-h-[180px] md:min-h-[260px] flex flex-col justify-center transition-all duration-500`}>
            <span className="text-4xl md:text-5xl mb-3">{heroSlides[currentSlide].icon}</span>
            <h2 className="text-xl md:text-3xl font-black text-white leading-tight">{heroSlides[currentSlide].title}</h2>
            <p className="text-white/70 text-sm md:text-base mt-1 italic">{heroSlides[currentSlide].subtitle}</p>
            <a href={heroSlides[currentSlide].ctaLink} className="inline-block self-start mt-4 bg-white text-gray-800 text-xs md:text-sm font-bold px-5 py-2.5 rounded-full shadow hover:bg-gray-100 transition-colors">
              {heroSlides[currentSlide].cta} →
            </a>
            {/* Dots */}
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {heroSlides.map((_, i) => (
                <button key={i} onClick={() => setCurrentSlide(i)} className={`h-1.5 rounded-full transition-all ${i === currentSlide ? "bg-white w-5" : "bg-white/40 w-1.5"}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Earn CTA Banner */}
        <div className="px-4 mt-4">
          <a href="/auth?tab=provider" className="block bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-4 text-white relative overflow-hidden">
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full" />
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl shrink-0">🛠️</div>
              <div>
                <p className="font-bold text-sm">Got skills? Start earning today!</p>
                <p className="text-white/70 text-[11px] mt-0.5">Kumita sa imong bakanteng oras — register as a service provider</p>
              </div>
              <svg className="w-5 h-5 text-white/60 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </div>
          </a>
        </div>

        {/* Service Categories */}
        <div className="px-4 mt-6" id="services">
          <h3 className="font-bold text-sm text-gray-800 mb-3">Browse by Category</h3>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  selectedCategory === cat.id ? "border-teal-500 bg-teal-50 shadow-sm" : "border-gray-100 bg-white"
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-[10px] font-bold text-gray-700">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Book Button */}
        <div className="px-4 mt-5">
          <a href="/services" className="block w-full bg-teal-600 text-white text-center py-3.5 rounded-xl font-bold text-sm hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20">
            📋 Book a Home Service Now
          </a>
        </div>

        {/* Service Providers */}
        <div className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-gray-800">
              {selectedCategory ? `${SERVICE_CATEGORIES.find((c) => c.id === selectedCategory)?.name} Providers` : "Available Providers"}
            </h3>
            {selectedCategory && (
              <button onClick={() => setSelectedCategory(null)} className="text-[10px] text-teal-600 font-bold">Show All</button>
            )}
          </div>

          {filteredProviders.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <span className="text-4xl">👷</span>
              <p className="text-gray-400 text-sm mt-3">No providers available yet</p>
              <p className="text-gray-300 text-[10px] mt-1">Be the first! Register as a provider</p>
              <a href="/auth?tab=provider" className="inline-block mt-3 bg-teal-600 text-white px-4 py-2 rounded-lg text-xs font-bold">Register Now</a>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProviders.map((provider) => (
                <div key={provider.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-14 h-14 rounded-full bg-teal-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {provider.photoUrl ? (
                        <img src={provider.photoUrl} alt={provider.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">👷</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-gray-800 truncate">{provider.name}</p>
                        {provider.available && <span className="w-2 h-2 bg-green-500 rounded-full shrink-0" />}
                      </div>
                      {/* Skills */}
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {provider.skills.slice(0, 4).map((skill) => (
                          <span key={skill} className="text-[9px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{skill}</span>
                        ))}
                      </div>
                      {provider.bio && <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2">{provider.bio}</p>}
                      {/* Stats */}
                      <div className="flex items-center gap-3 mt-2">
                        {provider.rating > 0 && (
                          <span className="text-[10px] text-yellow-600 font-bold">⭐ {provider.rating.toFixed(1)}</span>
                        )}
                        {provider.completedJobs > 0 && (
                          <span className="text-[10px] text-gray-400">{provider.completedJobs} jobs done</span>
                        )}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${provider.available ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {provider.available ? "AVAILABLE" : "BUSY"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Book Button */}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                    <a href={`tel:${provider.phone}`} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-xs font-bold text-center hover:bg-gray-50">📞 Call</a>
                    <a href="/services" className="flex-1 bg-teal-600 text-white py-2.5 rounded-lg text-xs font-bold text-center hover:bg-teal-700">Book Service</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How It Works */}
        <div className="px-4 mt-8">
          <h3 className="font-bold text-sm text-gray-800 mb-3">How It Works</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: "📋", title: "Choose", desc: "Pick a service" },
              { icon: "👷", title: "Match", desc: "We find a pro" },
              { icon: "✅", title: "Done", desc: "Job completed" },
            ].map((s) => (
              <div key={s.title} className="bg-white rounded-xl p-3 border border-gray-100 text-center">
                <span className="text-2xl">{s.icon}</span>
                <p className="font-bold text-xs text-gray-800 mt-1">{s.title}</p>
                <p className="text-[9px] text-gray-400">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Become a Provider CTA */}
        <div className="px-4 mt-8">
          <div className="bg-gradient-to-br from-[#16A34A] to-[#1F2937] rounded-2xl p-6 text-white text-center">
            <span className="text-4xl">💰</span>
            <h3 className="font-black text-lg mt-3">Earn with your skills</h3>
            <p className="text-white/60 text-xs mt-1">Kumita sa imong bakanteng oras gamit ang imong skills</p>
            <div className="grid grid-cols-3 gap-2 mt-4 mb-4">
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-lg font-bold">🔧</p>
                <p className="text-[9px] text-white/70">Plumbing</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-lg font-bold">❄️</p>
                <p className="text-[9px] text-white/70">Aircon</p>
              </div>
              <div className="bg-white/10 rounded-lg p-2">
                <p className="text-lg font-bold">⚡</p>
                <p className="text-[9px] text-white/70">Electrical</p>
              </div>
            </div>
            <a href="/auth?tab=provider" className="inline-block bg-white text-gray-800 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-100 transition-colors">
              Register as Provider
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
        <div className="max-w-lg mx-auto grid grid-cols-4 py-1.5">
          <a href="/" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
            <span className="text-[10px] font-medium">Home</span>
          </a>
          <a href="/grocery" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>
            <span className="text-[10px] font-medium">Grocery</span>
          </a>
          <a href="/home-services" className="flex flex-col items-center gap-0.5 py-1 text-teal-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span className="text-[10px] font-bold">Services</span>
          </a>
          <a href="/account" className="flex flex-col items-center gap-0.5 py-1 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            <span className="text-[10px] font-medium">Account</span>
          </a>
        </div>
      </nav>
    </main>
  )
}
