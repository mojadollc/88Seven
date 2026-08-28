"use client"

import { useState, useEffect, useRef } from "react"

type Props = {
  open: boolean
  onClose: () => void
  onSelect: (address: string, lat: number, lng: number) => void
  savedAddresses: any[]
  onSaveAddress: (addr: any) => void
  onDeleteAddress: (id: string) => void
}

type Suggestion = { display_name: string; lat: string; lon: string }

const LABEL_ICONS: Record<string, string> = { Home: "🏠", Office: "🏢", Other: "📍" }

export default function AddressPicker({ open, onClose, onSelect, savedAddresses, onSaveAddress, onDeleteAddress }: Props) {
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [searching, setSearching] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveLabel, setSaveLabel] = useState("Home")
  const [pendingAddr, setPendingAddr] = useState({ address: "", lat: 0, lng: 0 })
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 200)
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 3) { setSuggestions([]); return }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=ph`)
        const data = await res.json()
        setSuggestions(data)
      } catch { setSuggestions([]) }
      finally { setSearching(false) }
    }, 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [searchQuery])

  const handleDetect = () => {
    if (!navigator.geolocation) return
    setDetecting(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`)
          const data = await res.json()
          const addr = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
          onSelect(addr, latitude, longitude)
          onClose()
        } catch {
          onSelect(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, latitude, longitude)
          onClose()
        } finally { setDetecting(false) }
      },
      () => { setDetecting(false) },
      { enableHighAccuracy: true }
    )
  }

  const handleSelectSuggestion = (s: Suggestion) => {
    const lat = parseFloat(s.lat)
    const lng = parseFloat(s.lon)
    setPendingAddr({ address: s.display_name, lat, lng })
    setShowSaveForm(true)
    setSuggestions([])
    setSearchQuery("")
  }

  const handleUsePending = (save: boolean) => {
    if (save) {
      onSaveAddress({ id: Date.now().toString(), label: saveLabel, address: pendingAddr.address, lat: pendingAddr.lat, lng: pendingAddr.lng })
    }
    onSelect(pendingAddr.address, pendingAddr.lat, pendingAddr.lng)
    setShowSaveForm(false)
    onClose()
  }

  const handleSelectSaved = (addr: any) => {
    onSelect(addr.address, addr.lat, addr.lng)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex flex-col">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative mt-auto sm:mt-0 sm:m-auto bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base text-gray-800">Delivery Address</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          {/* Search Input */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              ref={inputRef}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for street, barangay, or city..."
              className="w-full border border-gray-200 rounded-xl pl-10 pr-4 py-3 text-sm outline-none focus:border-blue-600 placeholder:text-gray-400"
            />
            {searching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Save Form */}
          {showSaveForm && (
            <div className="px-5 py-4 bg-blue-50 border-b border-blue-100">
              <p className="text-xs font-bold text-gray-800 mb-1 line-clamp-2">{pendingAddr.address}</p>
              <p className="text-[10px] text-gray-500 mb-3">Save this address for quick access?</p>
              <div className="flex gap-2 mb-3">
                {["Home", "Office", "Other"].map((label) => (
                  <button key={label} onClick={() => setSaveLabel(label)} className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${saveLabel === label ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600"}`}>
                    {LABEL_ICONS[label]} {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleUsePending(false)} className="flex-1 border border-gray-200 bg-white text-gray-600 py-2 rounded-lg text-xs font-medium">Use without saving</button>
                <button onClick={() => handleUsePending(true)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-xs font-bold">Save & Use</button>
              </div>
            </div>
          )}

          {/* Use Current Location */}
          <button onClick={handleDetect} disabled={detecting} className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-100 transition-colors">
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-blue-600">{detecting ? "Detecting location..." : "Use my current location"}</p>
              <p className="text-[10px] text-gray-400">GPS auto-detect</p>
            </div>
          </button>

          {/* Search Suggestions */}
          {suggestions.length > 0 && (
            <div className="border-b border-gray-100">
              <p className="px-5 pt-3 pb-1 text-[10px] font-semibold text-gray-400 uppercase">Search Results</p>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => handleSelectSuggestion(s)} className="w-full px-5 py-3 flex items-start gap-3 hover:bg-gray-50 transition-colors">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                  <p className="text-xs text-gray-700 text-left leading-relaxed">{s.display_name}</p>
                </button>
              ))}
            </div>
          )}

          {/* Saved Addresses */}
          {savedAddresses.length > 0 && (
            <div>
              <p className="px-5 pt-4 pb-2 text-[10px] font-semibold text-gray-400 uppercase">Saved Addresses</p>
              {savedAddresses.map((addr) => (
                <div key={addr.id} className="flex items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                  <button onClick={() => handleSelectSaved(addr)} className="flex items-start gap-3 flex-1 text-left">
                    <div className="w-9 h-9 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm">{LABEL_ICONS[addr.label] || "📍"}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{addr.label}</p>
                      <p className="text-[11px] text-gray-400 truncate">{addr.address}</p>
                    </div>
                  </button>
                  <button onClick={() => onDeleteAddress(addr.id)} className="text-gray-300 hover:text-green-500 p-1 ml-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!showSaveForm && suggestions.length === 0 && savedAddresses.length === 0 && !searchQuery && (
            <div className="text-center py-10">
              <p className="text-2xl mb-2">📍</p>
              <p className="text-xs text-gray-400">Search or use GPS to set your address</p>
              <p className="text-[10px] text-gray-300 mt-1">Saved addresses will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
