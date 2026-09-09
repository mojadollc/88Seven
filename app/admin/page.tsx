"use client"

import { useEffect, useRef, useState } from "react"

const ITEMS_PER_PAGE = 20

export default function AdminProducts() {
  const [products, setProducts] = useState<any[]>([])
  const [localOverrides, setLocalOverrides] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "visible" | "hidden">("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [toggling, setToggling] = useState<string | null>(null)
  const [editing, setEditing] = useState<any>(null)
  const [editForm, setEditForm] = useState({ name: "", price: "", salePrice: "", onSale: false, stock: "", unit: "", category: "", showOnSite: true, bottleDeposit: "" })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [posRes, localRes] = await Promise.all([
        fetch("/api/pos-products"),
        fetch("/api/products?all=true"),
      ])
      const posData = await posRes.json()
      const localData: any[] = await localRes.json()
      const overrides: Record<string, any> = {}
      localData.forEach((p: any) => { overrides[p.id] = p })
      setLocalOverrides(overrides)
      setProducts(Array.isArray(posData.products) ? posData.products : [])
    } finally {
      setLoading(false)
    }
  }

  // Merge POS product with any local override
  function merged(p: any) {
    const ov = localOverrides[p.id]
    return ov ? { ...p, ...ov } : p
  }

  async function handleToggle(p: any) {
    const m = merged(p)
    const newVal = m.showOnSite === false ? true : false
    setToggling(p.id)
    try {
      const ov = localOverrides[p.id]
      if (ov) {
        await fetch(`/api/products/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ showOnSite: newVal }) })
      } else {
        // Create local record for this POS product
        await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id, name: p.name, price: p.price, stock: p.stock, category: p.category, unit: p.unit || "", imageUrl: p.imageUrl || "", showOnSite: newVal }) })
      }
      setLocalOverrides(prev => ({ ...prev, [p.id]: { ...(prev[p.id] || {}), id: p.id, showOnSite: newVal } }))
    } finally {
      setToggling(null)
    }
  }

  function openEdit(p: any) {
    const m = merged(p)
    setEditing(p)
    setEditForm({
      name: m.name,
      price: String(m.price),
      salePrice: String(m.salePrice || ""),
      onSale: !!m.onSale,
      stock: String(m.stock),
      unit: m.unit || "",
      category: m.category || "",
      showOnSite: m.showOnSite !== false,
      bottleDeposit: m.bottleDeposit ? String(m.bottleDeposit) : "",
    })
  }

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    try {
      const updates = {
        name: editForm.name.trim(),
        price: parseFloat(editForm.price) || 0,
        salePrice: editForm.onSale ? (parseFloat(editForm.salePrice) || null) : null,
        onSale: editForm.onSale,
        stock: parseInt(editForm.stock) || 0,
        unit: editForm.unit.trim(),
        category: editForm.category,
        showOnSite: editForm.showOnSite,
        imageUrl: merged(editing).imageUrl || "",
        bottleDeposit: editForm.bottleDeposit ? parseFloat(editForm.bottleDeposit) : null,
      }
      const ov = localOverrides[editing.id]
      if (ov) {
        await fetch(`/api/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) })
      } else {
        await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, ...updates }) })
      }
      setLocalOverrides(prev => ({ ...prev, [editing.id]: { ...(prev[editing.id] || {}), id: editing.id, ...updates } }))
      setEditing(null)
    } finally {
      setSaving(false)
    }
  }

  async function handleImageUpload(file: File) {
    if (!editing) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "products")
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const { url } = await res.json()
      const ov = localOverrides[editing.id]
      if (ov) {
        await fetch(`/api/products/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl: url }) })
      } else {
        await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editing.id, name: editing.name, price: editing.price, stock: editing.stock, category: editing.category, unit: editing.unit || "", imageUrl: url, showOnSite: true }) })
      }
      setLocalOverrides(prev => ({ ...prev, [editing.id]: { ...(prev[editing.id] || {}), id: editing.id, imageUrl: url } }))
      setEditing((prev: any) => prev ? { ...prev, imageUrl: url } : prev)
    } finally {
      setUploading(false)
    }
  }

  const filtered = products
    .map(merged)
    .filter(p => p.name?.toLowerCase().includes(search.toLowerCase()))
    .filter(p => {
      if (filterStatus === "visible") return p.showOnSite !== false
      if (filterStatus === "hidden") return p.showOnSite === false
      return true
    })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [search, filterStatus])

  const editingMerged = editing ? merged(editing) : null

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1F2937]">Product Management</h1>
            <p className="text-xs text-gray-400 mt-0.5">Synced from POS · {products.length} products</p>
          </div>
          <button onClick={load} className="text-xs text-[#319F44] border border-[#319F44] px-3 py-1.5 rounded-lg hover:bg-[#319F44]/10 transition-colors">↻ Refresh</button>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total", value: products.length, color: "text-[#1F2937]" },
            { label: "Visible", value: products.map(merged).filter(p => p.showOnSite !== false).length, color: "text-[#319F44]" },
            { label: "Hidden", value: products.map(merged).filter(p => p.showOnSite === false).length, color: "text-gray-500" },
            { label: "Low Stock", value: products.map(merged).filter(p => p.stock <= 5).length, color: "text-orange-500" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-4 p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#319F44]" />
          </div>
          <div className="flex gap-2">
            {(["all", "visible", "hidden"] as const).map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-2 rounded-lg text-xs font-medium capitalize ${filterStatus === s ? "bg-[#319F44] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>{s}</button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[56px_1fr_90px_70px_120px_80px_60px] gap-3 px-5 py-3 bg-gray-50 border-b text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            <span>Image</span><span>Name</span><span>Price</span><span>Stock</span><span>Category</span><span className="text-center">Visible</span><span className="text-center">Edit</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-gray-400 text-sm">Loading products from POS...</div>
          ) : paginated.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-sm">No products found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {paginated.map(p => (
                <div key={p.id} className={`grid grid-cols-1 md:grid-cols-[56px_1fr_90px_70px_120px_80px_60px] gap-3 px-5 py-3 items-center hover:bg-gray-50/50 ${p.showOnSite === false ? "opacity-50" : ""}`}>
                  <div className="w-10 h-10 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                    {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-contain" alt={p.name} /> : <span className="text-lg">📦</span>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#1F2937] line-clamp-1">{p.name}</p>
                    <p className="text-xs text-gray-400 md:hidden">{p.category} · ₱{p.price} · Stock: {p.stock}</p>
                    {p.onSale && p.salePrice && <span className="text-[10px] bg-red-100 text-red-600 font-bold px-1.5 py-0.5 rounded">SALE ₱{p.salePrice}</span>}
                  </div>
                  <span className="hidden md:block text-sm font-semibold text-[#267a34]">₱{Number(p.price).toFixed(2)}</span>
                  <span className={`hidden md:block text-sm font-medium ${p.stock <= 5 ? "text-orange-500" : "text-gray-700"}`}>{p.stock}</span>
                  <span className="hidden md:block text-xs text-gray-500 truncate">{p.category}</span>
                  <div className="hidden md:flex justify-center">
                    <button onClick={() => handleToggle(p)} disabled={toggling === p.id} className={`relative w-11 h-6 rounded-full transition-colors ${p.showOnSite !== false ? "bg-[#319F44]" : "bg-gray-300"} ${toggling === p.id ? "opacity-50" : ""}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${p.showOnSite !== false ? "translate-x-5" : ""}`} />
                    </button>
                  </div>
                  <div className="flex justify-end md:justify-center">
                    <button onClick={() => openEdit(p)} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50/50">
              <p className="text-xs text-gray-500">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-1">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg text-xs bg-white border text-gray-600 disabled:opacity-40">Prev</button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg text-xs bg-white border text-gray-600 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── EDIT MODAL ── */}
      {editing && editingMerged && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between" style={{ background: "var(--theme-bg, #319F44)" }}>
              <h2 className="font-bold text-white">Edit Product</h2>
              <button onClick={() => setEditing(null)} className="text-white/80 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Image */}
              <div className="flex items-center gap-4">
                <button onClick={() => fileRef.current?.click()} className="w-20 h-20 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#319F44] flex items-center justify-center overflow-hidden transition-colors shrink-0">
                  {uploading ? <svg className="w-6 h-6 text-gray-400 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" /><path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                    : editingMerged.imageUrl ? <img src={editingMerged.imageUrl} className="w-full h-full object-contain" alt="" />
                    : <span className="text-3xl">📦</span>}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { if (e.target.files?.[0]) handleImageUpload(e.target.files[0]) }} />
                <div className="text-xs text-gray-400"><p className="font-medium text-gray-600 mb-0.5">Product Image</p><p>Click thumbnail to change</p></div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Product Name</label>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#319F44]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Price (₱)</label>
                  <input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Stock</label>
                  <input type="number" min="0" value={editForm.stock} onChange={e => setEditForm({ ...editForm, stock: e.target.value })} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                </div>
              </div>

              {/* Sale price */}
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.onSale} onChange={e => setEditForm({ ...editForm, onSale: e.target.checked })} className="accent-red-500 w-4 h-4" />
                  <span className="text-xs font-semibold text-gray-600">On Sale</span>
                </label>
                {editForm.onSale && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500">Sale Price (₱)</label>
                    <input type="number" min="0" step="0.01" value={editForm.salePrice} onChange={e => setEditForm({ ...editForm, salePrice: e.target.value })} className="w-full mt-1 border border-red-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-red-400" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500">Category</label>
                  <input value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500">Unit</label>
                  <input placeholder="pc, kg, pack…" value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#319F44]" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500">Bottle Deposit / Pundo (₱) <span className="text-gray-400 font-normal">— leave blank if none</span></label>
                <input type="number" min="0" step="0.01" placeholder="e.g. 10" value={editForm.bottleDeposit} onChange={e => setEditForm({ ...editForm, bottleDeposit: e.target.value })} className="w-full mt-1 border border-orange-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editForm.showOnSite} onChange={e => setEditForm({ ...editForm, showOnSite: e.target.checked })} className="accent-[#319F44] w-4 h-4" />
                <span className="text-xs font-semibold text-gray-600">Visible on grocery store</span>
              </label>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 border border-gray-200 py-2.5 rounded-xl text-sm text-gray-600">Cancel</button>
              <button onClick={handleSave} disabled={saving || !editForm.name.trim()} className="flex-1 bg-[#319F44] text-white py-2.5 rounded-xl text-sm font-bold disabled:opacity-40">
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
