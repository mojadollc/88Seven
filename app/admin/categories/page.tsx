"use client"

import { useEffect, useState } from "react"
import { getStoreCategories, updateStoreCategory, createStoreCategory, deleteStoreCategory, type Category } from "@/lib/firebase"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState({ name: "", emoji: "", order: 0 })
  const [uploading, setUploading] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [newForm, setNewForm] = useState({ name: "", emoji: "", order: 0 })

  const load = async () => {
    const cats = await getStoreCategories()
    setCategories(cats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleEdit = (cat: Category) => {
    setEditing(cat)
    setForm({ name: cat.name, emoji: cat.emoji || "", order: cat.order || 0 })
  }

  const handleSave = async () => {
    if (!editing) return
    await updateStoreCategory(editing.id, { name: form.name, emoji: form.emoji, order: form.order })
    setEditing(null)
    load()
  }

  const handleImageUpload = async (catId: string, file: File) => {
    setUploading(true)
    try {
      const storage = getStorage()
      const storageRef = ref(storage, `categories/${catId}/${file.name}`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      await updateStoreCategory(catId, { imageUrl: url })
      load()
    } finally {
      setUploading(false)
    }
  }

  const handleAdd = async () => {
    if (!newForm.name.trim()) return
    await createStoreCategory({ name: newForm.name, emoji: newForm.emoji, order: newForm.order })
    setShowAdd(false)
    setNewForm({ name: "", emoji: "", order: 0 })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return
    await deleteStoreCategory(id)
    load()
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Categories</h1>
        <button onClick={() => setShowAdd(true)} className="bg-[#D62828] text-white px-4 py-2 rounded-lg text-sm font-medium">+ Add Category</button>
      </div>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : categories.length === 0 ? (
        <p className="text-gray-400">No categories found. Add one or check your store ID.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">{cat.emoji || "📁"}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800 truncate">{cat.name}</p>
                  <p className="text-xs text-gray-400">Order: {cat.order || 0}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(cat)} className="flex-1 text-xs bg-blue-50 text-blue-600 py-1.5 rounded-lg font-medium">Edit</button>
                <label className="flex-1 text-xs bg-green-50 text-green-600 py-1.5 rounded-lg font-medium text-center cursor-pointer">
                  {uploading ? "..." : "Image"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleImageUpload(cat.id, e.target.files[0]) }} />
                </label>
                <button onClick={() => handleDelete(cat.id)} className="text-xs bg-red-50 text-red-600 py-1.5 px-3 rounded-lg font-medium">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditing(null)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-lg">Edit Category</h2>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Emoji (optional)" value={form.emoji} onChange={(e) => setForm({ ...form, emoji: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Order" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setEditing(null)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSave} className="flex-1 bg-[#D62828] text-white py-2 rounded-lg text-sm font-bold">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdd(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-sm p-6 space-y-4">
            <h2 className="font-bold text-lg">Add Category</h2>
            <input placeholder="Name" value={newForm.name} onChange={(e) => setNewForm({ ...newForm, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="Emoji (optional)" value={newForm.emoji} onChange={(e) => setNewForm({ ...newForm, emoji: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="Order" value={newForm.order} onChange={(e) => setNewForm({ ...newForm, order: Number(e.target.value) })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 border py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleAdd} className="flex-1 bg-[#D62828] text-white py-2 rounded-lg text-sm font-bold">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
