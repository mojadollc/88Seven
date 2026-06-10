"use client"

import { useEffect, useState } from "react"
import { getDrivers, updateDriver, type Driver } from "@/lib/firebase"
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage"

export default function DriverProfilePage() {
  const [driver, setDriver] = useState<Driver | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selfiePreview, setSelfiePreview] = useState("")
  const [nbiPreview, setNbiPreview] = useState("")
  const [vehiclePreview, setVehiclePreview] = useState("")
  const [form, setForm] = useState({ phone: "", vehicleType: "motorcycle", plateNumber: "" })
  const [selfieFile, setSelfieFile] = useState<File | null>(null)
  const [nbiFile, setNbiFile] = useState<File | null>(null)
  const [vehicleFile, setVehicleFile] = useState<File | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("driver_session")
    if (!saved) { window.location.href = "/driver"; return }
    const session = JSON.parse(saved)
    getDrivers().then((all) => {
      const found = all.find((d) => d.id === session.id)
      if (found) {
        setDriver(found)
        setForm({ phone: found.phone || "", vehicleType: found.vehicleType || "motorcycle", plateNumber: found.plateNumber || "" })
        if (found.selfieUrl) setSelfiePreview(found.selfieUrl)
        if (found.nbiUrl) setNbiPreview(found.nbiUrl)
        if (found.vehicleUrl) setVehiclePreview(found.vehicleUrl)
      }
      setLoading(false)
    })
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "selfie" | "nbi" | "vehicle") => {
    const file = e.target.files?.[0]
    if (!file) return
    const preview = URL.createObjectURL(file)
    if (type === "selfie") { setSelfieFile(file); setSelfiePreview(preview) }
    if (type === "nbi") { setNbiFile(file); setNbiPreview(preview) }
    if (type === "vehicle") { setVehicleFile(file); setVehiclePreview(preview) }
  }

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const storage = getStorage()
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }

  const handleSave = async () => {
    if (!driver || !selfieFile && !selfiePreview || !nbiFile && !nbiPreview || !vehicleFile && !vehiclePreview || !form.phone || !form.plateNumber) {
      alert("Please complete all fields and upload all required documents")
      return
    }
    setSaving(true)
    try {
      const updates: any = { phone: form.phone, vehicleType: form.vehicleType, plateNumber: form.plateNumber, profileComplete: true }
      if (selfieFile) updates.selfieUrl = await uploadFile(selfieFile, `riders/${driver.id}/selfie`)
      if (nbiFile) updates.nbiUrl = await uploadFile(nbiFile, `riders/${driver.id}/nbi`)
      if (vehicleFile) updates.vehicleUrl = await uploadFile(vehicleFile, `riders/${driver.id}/vehicle`)
      await updateDriver(driver.id, updates)
      window.location.href = "/driver"
    } catch (e) {
      console.error(e)
      alert("Failed to save. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 border-4 border-[#D62828] border-t-transparent rounded-full animate-spin" /></div>

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-[#D62828] text-white px-4 py-3 sticky top-0 z-50">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-sm">Complete Your Profile</h1>
          <p className="text-white/60 text-[10px]">Required before you can accept deliveries</p>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-4 pb-24">
        {/* 1. Selfie */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-1">1. Profile Photo (Selfie)</h3>
          <p className="text-[10px] text-gray-400 mb-3">Take a clear face photo for your rider profile</p>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300">
              {selfiePreview ? <img src={selfiePreview} className="w-full h-full object-cover" /> : (
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              )}
            </div>
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg py-3 text-center hover:bg-blue-100 transition-colors">
                <p className="text-xs text-blue-600 font-medium">{selfiePreview ? "Change Photo" : "Upload Selfie"}</p>
              </div>
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => handleFileChange(e, "selfie")} />
            </label>
          </div>
        </div>

        {/* 2. Government ID */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-1">2. Government ID</h3>
          <p className="text-[10px] text-gray-400 mb-3">Upload NBI Clearance or Barangay Clearance</p>
          {nbiPreview ? (
            <div className="relative rounded-lg overflow-hidden border border-gray-200">
              <img src={nbiPreview} className="w-full h-32 object-cover" />
              <label className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-[10px] font-medium cursor-pointer">Change</label>
            </div>
          ) : null}
          <label className="block cursor-pointer mt-2">
            <div className="border-2 border-dashed border-gray-300 rounded-lg py-4 text-center hover:bg-gray-50 transition-colors">
              <svg className="w-6 h-6 text-gray-300 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              <p className="text-xs text-gray-500">{nbiPreview ? "Replace document" : "Upload NBI / Barangay Clearance"}</p>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "nbi")} />
          </label>
        </div>

        {/* 3. Vehicle */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-1">3. Vehicle Information</h3>
          <p className="text-[10px] text-gray-400 mb-3">Photo of your motorcycle/e-bike with visible plate number</p>
          <div className="space-y-3">
            <select value={form.vehicleType} onChange={(e) => setForm({ ...form, vehicleType: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D62828]">
              <option value="motorcycle">Motorcycle</option>
              <option value="ebike">E-Bike</option>
              <option value="bicycle">Bicycle</option>
            </select>
            <input placeholder="Plate Number" value={form.plateNumber} onChange={(e) => setForm({ ...form, plateNumber: e.target.value.toUpperCase() })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D62828]" />
            {vehiclePreview && <img src={vehiclePreview} className="w-full h-32 object-cover rounded-lg border border-gray-200" />}
            <label className="block cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 rounded-lg py-3 text-center hover:bg-gray-50 transition-colors">
                <p className="text-xs text-gray-500">{vehiclePreview ? "Change vehicle photo" : "Upload vehicle photo"}</p>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, "vehicle")} />
            </label>
          </div>
        </div>

        {/* 4. Phone */}
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="font-bold text-sm text-gray-800 mb-1">4. Contact Number</h3>
          <input type="tel" placeholder="09xxxxxxxxx" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, "") })} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#D62828]" />
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-lg mx-auto">
        <button onClick={handleSave} disabled={saving} className="w-full bg-[#D62828] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#b71c1c] transition-colors disabled:opacity-50">
          {saving ? "Saving..." : "Complete Profile"}
        </button>
      </div>
    </main>
  )
}
