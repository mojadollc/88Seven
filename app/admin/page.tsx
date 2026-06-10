"use client"

import { useEffect, useState } from "react"
import { getAllProducts, toggleProductVisibility, type Product } from "@/lib/firebase"
import { doc, updateDoc, getFirestore } from "firebase/firestore"

const db = getFirestore()

const ITEMS_PER_PAGE = 20

export default function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [toggling, setToggling] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState<"all" | "visible" | "hidden">("all")

  const [editingDeposit, setEditingDeposit] = useState<string | null>(null)
  const [depositValue, setDepositValue] = useState("")

  useEffect(() => { loadProducts() }, [])

  async function loadProducts() {
    setLoading(true)
    try {
      const prods = await getAllProducts()
      setProducts(prods)
    } catch (e) {
      console.error("Failed to load products:", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggle(product: Product) {
    setToggling(product.id)
    const newValue = product.showOnSite === false ? true : false
    try {
      await toggleProductVisibility(product.id, newValue)
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, showOnSite: newValue } : p))
      )
    } catch (e) {
      console.error("Failed to toggle:", e)
    } finally {
      setToggling(null)
    }
  }

  async function handleSetDeposit(product: Product) {
    const val = parseFloat(depositValue)
    if (isNaN(val) || val < 0) { setEditingDeposit(null); return }
    const ref = doc(db, "products", product.id)
    await updateDoc(ref, { bottleDeposit: val || 0 })
    setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, bottleDeposit: val || 0 } : p))
    setEditingDeposit(null)
  }

  const filtered = products
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))
    .filter((p) => {
      if (filterStatus === "visible") return p.showOnSite !== false
      if (filterStatus === "hidden") return p.showOnSite === false
      return true
    })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)

  useEffect(() => { setCurrentPage(1) }, [search, filterStatus])

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <h1 className="text-lg font-bold text-[#1a1a2e]">Product Management</h1>
      </header>

      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xl font-bold text-[#1a1a2e]">{products.length}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xl font-bold text-green-600">{products.filter((p) => p.showOnSite !== false).length}</p>
            <p className="text-xs text-gray-400">Visible</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xl font-bold text-red-600">{products.filter((p) => p.showOnSite === false).length}</p>
            <p className="text-xs text-gray-400">Hidden</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-xl font-bold text-orange-600">{products.filter((p) => p.stock <= 5).length}</p>
            <p className="text-xs text-gray-400">Low Stock</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm mb-6">
          <div className="p-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#D62828] focus:ring-1 focus:ring-[#D62828]/20 transition-all"
              />
            </div>
            <div className="flex gap-2">
              {(["all", "visible", "hidden"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors capitalize ${
                    filterStatus === status ? "bg-[#D62828] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[60px_1fr_100px_140px_100px_100px] gap-4 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Image</span>
            <span>Product</span>
            <span>Stock</span>
            <span>Category</span>
            <span className="text-center">Pundo</span>
            <span className="text-center">Visibility</span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-400 text-sm">Loading products...</div>
          ) : paginated.length === 0 ? (
            <div className="p-10 text-center text-gray-400 text-sm">No products found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {paginated.map((product) => (
                <div key={product.id} className="grid grid-cols-1 md:grid-cols-[60px_1fr_100px_140px_100px_100px] gap-3 md:gap-4 px-5 py-4 items-center hover:bg-gray-50/50 transition-colors">
                  <div>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-11 h-11 object-contain rounded-lg border border-gray-100" />
                    ) : (
                      <div className="w-11 h-11 bg-gray-100 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-[#1a1a2e] line-clamp-1">{product.name}</p>
                    <p className="text-xs text-gray-400 md:hidden">{product.category} · Stock: {product.stock}</p>
                  </div>
                  <div className="hidden md:block">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      product.stock <= 5 ? "bg-red-50 text-red-600" : product.stock <= 20 ? "bg-yellow-50 text-yellow-700" : "bg-green-50 text-green-700"
                    }`}>
                      {product.stock}
                    </span>
                  </div>
                  <div className="hidden md:block">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{product.category}</span>
                  </div>
                  <div className="hidden md:flex justify-center">
                    {editingDeposit === product.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={depositValue}
                          onChange={(e) => setDepositValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSetDeposit(product)}
                          className="w-16 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#D62828]"
                          autoFocus
                        />
                        <button onClick={() => handleSetDeposit(product)} className="text-green-600 text-xs font-bold">✓</button>
                        <button onClick={() => setEditingDeposit(null)} className="text-gray-400 text-xs">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingDeposit(product.id); setDepositValue(String(product.bottleDeposit || 0)) }}
                        className={`text-xs px-2 py-1 rounded transition-colors ${product.bottleDeposit ? "bg-orange-50 text-orange-700 font-medium" : "bg-gray-50 text-gray-400 hover:bg-gray-100"}`}
                      >
                        {product.bottleDeposit ? `₱${product.bottleDeposit}` : "—"}
                      </button>
                    )}
                  </div>
                  <div className="flex justify-end md:justify-center">
                    <button
                      onClick={() => handleToggle(product)}
                      disabled={toggling === product.id}
                      className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
                        product.showOnSite !== false ? "bg-green-500" : "bg-gray-300"
                      } ${toggling === product.id ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                        product.showOnSite !== false ? "translate-x-6" : ""
                      }`} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100 bg-gray-50/50">
              <p className="text-xs text-gray-500">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Previous</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number
                  if (totalPages <= 5) page = i + 1
                  else if (currentPage <= 3) page = i + 1
                  else if (currentPage >= totalPages - 2) page = totalPages - 4 + i
                  else page = currentPage - 2 + i
                  return (
                    <button key={page} onClick={() => setCurrentPage(page)} className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${currentPage === page ? "bg-[#D62828] text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>{page}</button>
                  )
                })}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">Next</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
