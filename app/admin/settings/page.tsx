"use client"

import { useEffect, useState } from "react"
import { getDeliverySettings, updateDeliverySettings, type DeliverySettings, type ServiceFeeConfig } from "@/lib/firebase"
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore"

const db = getFirestore()

export type PaymentMethodsConfig = {
  cod: boolean
  wallet: boolean
  qrph: boolean
  ewallet: boolean
  bank: boolean
  xendit: boolean
}

const DEFAULT_SETTINGS: DeliverySettings = {
  storeLat: 0, storeLng: 0, riderFeePerDelivery: 30,
  riderCommissionPercent: 20, partnerCommissionPercent: 15,
  freeDeliveryMinOrder: 1000, freeDeliveryArea: "Lapu-Lapu City, Cebu 6015",
  grocery: { baseFare: 39, baseKm: 2, perKmRate: 10, surgeMultiplier: 1.5, surgeEnabled: false },
  laundry: { baseFare: 29, baseKm: 2, perKmRate: 12, surgeMultiplier: 1.5, surgeEnabled: false },
}

type SettingsTab = "delivery" | "commission" | "payments" | "listing"

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<DeliverySettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<SettingsTab>("delivery")
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodsConfig>({
    cod: true, wallet: true, qrph: true, ewallet: true, bank: true, xendit: true,
  })
  const [listingMode, setListingMode] = useState<"free" | "wallet_required">("free")

  useEffect(() => {
    async function load() {
      const [data, pmSnap, lmSnap] = await Promise.all([
        getDeliverySettings(),
        getDoc(doc(db, "appSettings", "paymentMethods")),
        getDoc(doc(db, "appSettings", "listingMode")),
      ])
      setSettings({ ...DEFAULT_SETTINGS, ...data })
      if (pmSnap.exists()) setPaymentMethods({ cod: true, wallet: true, qrph: true, ewallet: true, bank: true, xendit: true, ...pmSnap.data() })
      if (lmSnap.exists()) setListingMode(lmSnap.data().mode || "free")
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await Promise.all([
      updateDeliverySettings(settings),
      setDoc(doc(db, "appSettings", "paymentMethods"), paymentMethods),
      setDoc(doc(db, "appSettings", "listingMode"), { mode: listingMode }),
    ])
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const detectStoreLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => setSettings({ ...settings, storeLat: pos.coords.latitude, storeLng: pos.coords.longitude }),
      () => alert("Unable to get location")
    )
  }

  const updateServiceConfig = (service: "grocery" | "laundry", field: keyof ServiceFeeConfig, value: number | boolean) => {
    setSettings({ ...settings, [service]: { ...settings[service], [field]: value } })
  }

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-8 h-8 border-3 border-[#D62828] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-400">Loading settings...</p>
      </div>
    </div>
  )

  const TABS: { key: SettingsTab; label: string; icon: string }[] = [
    { key: "delivery", label: "Delivery & Fees", icon: "🚚" },
    { key: "commission", label: "Commissions", icon: "💰" },
    { key: "payments", label: "Payments", icon: "💳" },
    { key: "listing", label: "Listing Mode", icon: "🏪" },
  ]

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[#1a1a2e]">Settings</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">Configure delivery, payments, and platform settings</p>
          </div>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#D62828] text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-[#b71c1c] transition-colors disabled:opacity-50 shadow-sm">
            {saving ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Saving...</>
            ) : saved ? (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg> Saved!</>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      </header>

      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl max-w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                tab === t.key ? "bg-white text-[#1a1a2e] shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span className="text-base">{t.icon}</span>
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Success Banner */}
        {saved && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-[fadeIn_0.2s_ease-out]">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <p className="text-sm text-green-800 font-medium">All settings saved successfully!</p>
          </div>
        )}

        <div className="max-w-4xl">
          {/* ═══ DELIVERY & FEES TAB ═══ */}
          {tab === "delivery" && (
            <div className="space-y-6">
              {/* Store Location */}
              <Section title="Store Location" desc="Base location for delivery distance calculations">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Field label="Latitude">
                    <input type="number" step="any" placeholder="10.3157" value={settings.storeLat || ""} onChange={(e) => setSettings({ ...settings, storeLat: Number(e.target.value) })} className="input-field" />
                  </Field>
                  <Field label="Longitude">
                    <input type="number" step="any" placeholder="123.9550" value={settings.storeLng || ""} onChange={(e) => setSettings({ ...settings, storeLng: Number(e.target.value) })} className="input-field" />
                  </Field>
                  <Field label="Auto-Detect">
                    <button onClick={detectStoreLocation} className="w-full h-[42px] border-2 border-dashed border-blue-300 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">📍 Use Current Location</button>
                  </Field>
                </div>
                {settings.storeLat > 0 && <p className="text-[10px] text-green-600 mt-2">✓ Location set: {settings.storeLat.toFixed(4)}, {settings.storeLng.toFixed(4)}</p>}
              </Section>

              {/* Grocery Fee */}
              <Section title="Grocery Delivery Fee" desc="Fee structure for grocery deliveries">
                <FeeGrid config={settings.grocery} onChange={(f, v) => updateServiceConfig("grocery", f, v)} />
              </Section>

              {/* Laundry Fee */}
              <Section title="Laundry Pickup & Delivery Fee" desc="Fee structure for laundry pickups and deliveries">
                <FeeGrid config={settings.laundry} onChange={(f, v) => updateServiceConfig("laundry", f, v)} />
              </Section>

              {/* Free Delivery */}
              <Section title="Free Delivery Threshold" desc="Minimum order amount for free delivery on grocery">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Minimum Order (₱)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₱</span>
                      <input type="number" min={0} value={settings.freeDeliveryMinOrder} onChange={(e) => setSettings({ ...settings, freeDeliveryMinOrder: Number(e.target.value) })} className="input-field pl-8" />
                    </div>
                  </Field>
                  <Field label="Coverage Area">
                    <input type="text" value={settings.freeDeliveryArea} onChange={(e) => setSettings({ ...settings, freeDeliveryArea: e.target.value })} className="input-field" />
                  </Field>
                </div>
              </Section>
            </div>
          )}

          {/* ═══ COMMISSIONS TAB ═══ */}
          {tab === "commission" && (
            <div className="space-y-6">
              {/* Rider Commission */}
              <Section title="Rider Commission" desc="Platform cut from rider delivery fees">
                <div className="flex items-start gap-6">
                  <Field label="Commission Rate">
                    <div className="relative w-28">
                      <input type="number" min={0} max={100} value={settings.riderCommissionPercent} onChange={(e) => setSettings({ ...settings, riderCommissionPercent: Number(e.target.value) })} className="input-field pr-8 text-center text-lg font-bold" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    </div>
                  </Field>
                  <div className="flex-1 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Example: ₱49 delivery fee</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Rider gets</p>
                        <p className="text-xl font-bold text-green-600">₱{Math.round(49 * (100 - settings.riderCommissionPercent) / 100)}</p>
                      </div>
                      <div className="w-px h-10 bg-gray-200" />
                      <div>
                        <p className="text-xs text-gray-500">Platform gets</p>
                        <p className="text-xl font-bold text-[#D62828]">₱{Math.round(49 * settings.riderCommissionPercent / 100)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>

              {/* Partner Commission */}
              <Section title="Partner (Laundry) Commission" desc="Platform cut from partner service earnings">
                <div className="flex items-start gap-6">
                  <Field label="Commission Rate">
                    <div className="relative w-28">
                      <input type="number" min={0} max={100} value={settings.partnerCommissionPercent} onChange={(e) => setSettings({ ...settings, partnerCommissionPercent: Number(e.target.value) })} className="input-field pr-8 text-center text-lg font-bold" />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    </div>
                  </Field>
                  <div className="flex-1 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                    <p className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Example: ₱200 laundry order</p>
                    <div className="flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-500">Partner gets</p>
                        <p className="text-xl font-bold text-green-600">₱{Math.round(200 * (100 - settings.partnerCommissionPercent) / 100)}</p>
                      </div>
                      <div className="w-px h-10 bg-gray-200" />
                      <div>
                        <p className="text-xs text-gray-500">Platform gets</p>
                        <p className="text-xl font-bold text-[#D62828]">₱{Math.round(200 * settings.partnerCommissionPercent / 100)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Section>
            </div>
          )}

          {/* ═══ PAYMENTS TAB ═══ */}
          {tab === "payments" && (
            <div className="space-y-6">
              <Section title="Payment Methods" desc="Enable or disable payment options across all services (Grocery, Laundry, Home Services)">
                <div className="space-y-2">
                  {([
                    { key: "cod" as const, label: "Cash on Delivery", desc: "Customer pays cash to the rider on delivery", icon: "💵", color: "green" },
                    { key: "wallet" as const, label: "Payroo Wallet", desc: "Deduct from customer's in-app wallet balance", icon: "👛", color: "purple" },
                    { key: "qrph" as const, label: "QR Ph (InstaPay)", desc: "Scan QR code with any Philippine banking app", icon: "📱", color: "blue" },
                    { key: "ewallet" as const, label: "E-Wallets", desc: "GrabPay, Maya, ShopeePay", icon: "📲", color: "cyan" },
                    { key: "bank" as const, label: "Bank Transfer", desc: "BPI, UnionBank, RCBC — Direct Debit", icon: "🏦", color: "emerald" },
                    { key: "xendit" as const, label: "Online Payment (Xendit)", desc: "All-in-one payment gateway for services", icon: "💳", color: "indigo" },
                  ]).map((pm) => (
                    <div key={pm.key} className={`flex items-center gap-4 border rounded-xl px-5 py-4 transition-all ${paymentMethods[pm.key] ? "border-green-200 bg-white shadow-sm" : "border-gray-100 bg-gray-50/50"}`}>
                      <span className="text-2xl">{pm.icon}</span>
                      <div className="flex-1">
                        <p className={`text-sm font-semibold ${paymentMethods[pm.key] ? "text-gray-800" : "text-gray-400"}`}>{pm.label}</p>
                        <p className="text-[11px] text-gray-400">{pm.desc}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${paymentMethods[pm.key] ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                          {paymentMethods[pm.key] ? "ACTIVE" : "OFF"}
                        </span>
                        <button
                          onClick={() => setPaymentMethods({ ...paymentMethods, [pm.key]: !paymentMethods[pm.key] })}
                          className={`relative w-11 h-6 rounded-full transition-colors ${paymentMethods[pm.key] ? "bg-green-500" : "bg-gray-300"}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${paymentMethods[pm.key] ? "translate-x-5" : ""}`} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            </div>
          )}

          {/* ═══ LISTING MODE TAB ═══ */}
          {tab === "listing" && (
            <div className="space-y-6">
              <Section title="Provider & Partner Visibility" desc="Control how laundry shops and service providers appear to customers">
                <div className="space-y-3">
                  <button
                    onClick={() => setListingMode("free")}
                    className={`w-full text-left border-2 rounded-xl px-6 py-5 transition-all ${listingMode === "free" ? "border-green-500 bg-green-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${listingMode === "free" ? "bg-green-500" : "bg-gray-200"}`}>
                        <span className="text-lg">🆓</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">Free Listing</p>
                        <p className="text-xs text-gray-500 mt-1">All approved partners and service providers are automatically visible to customers — <span className="font-semibold">no wallet top-up needed.</span></p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">✓ No barriers to entry</span>
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">✓ Best for growth</span>
                          <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-lg font-medium">✓ Partners accept bookings freely</span>
                        </div>
                      </div>
                      {listingMode === "free" && (
                        <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => setListingMode("wallet_required")}
                    className={`w-full text-left border-2 rounded-xl px-6 py-5 transition-all ${listingMode === "wallet_required" ? "border-orange-500 bg-orange-50 shadow-sm" : "border-gray-200 hover:border-gray-300"}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${listingMode === "wallet_required" ? "bg-orange-500" : "bg-gray-200"}`}>
                        <span className="text-lg">💰</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-gray-800">Wallet Balance Required</p>
                        <p className="text-xs text-gray-500 mt-1">Partners must maintain <span className="font-semibold text-orange-700">minimum ₱100</span> wallet balance to be listed and accept bookings. Ensures committed providers.</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium">⚠️ ₱100 minimum required</span>
                          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium">⚠️ Hidden if balance is 0</span>
                          <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-1 rounded-lg font-medium">✓ Ensures quality providers</span>
                        </div>
                      </div>
                      {listingMode === "wallet_required" && (
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center shrink-0">
                          <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </div>
                  </button>
                </div>

                {/* Current Mode Summary */}
                <div className={`mt-4 rounded-xl p-4 border ${listingMode === "free" ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{listingMode === "free" ? "🟢" : "🟠"}</span>
                    <p className={`text-xs font-bold ${listingMode === "free" ? "text-green-800" : "text-orange-800"}`}>
                      Currently: {listingMode === "free" ? "Free Listing — all approved providers are visible" : "Wallet Required — only providers with ₱100+ balance are visible"}
                    </p>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 ml-6">Applies to: Laundry Partners, Home Service Providers</p>
                </div>
              </Section>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 0.625rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        .input-field:focus {
          border-color: #D62828;
          box-shadow: 0 0 0 3px rgba(214, 40, 40, 0.08);
        }
      `}</style>
    </>
  )
}

function Section({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-bold text-[15px] text-[#1a1a2e]">{title}</h2>
        <p className="text-[11px] text-gray-400 mt-0.5">{desc}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function FeeGrid({ config, onChange }: { config: ServiceFeeConfig; onChange: (field: keyof ServiceFeeConfig, value: number | boolean) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <Field label="Base Fare (₱)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₱</span>
            <input type="number" min={0} value={config.baseFare} onChange={(e) => onChange("baseFare", Number(e.target.value))} className="input-field pl-8" />
          </div>
        </Field>
        <Field label="Base KM">
          <input type="number" min={0} step={0.5} value={config.baseKm} onChange={(e) => onChange("baseKm", Number(e.target.value))} className="input-field" />
        </Field>
        <Field label="Per KM Rate (₱)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₱</span>
            <input type="number" min={0} value={config.perKmRate} onChange={(e) => onChange("perKmRate", Number(e.target.value))} className="input-field pl-8" />
          </div>
        </Field>
      </div>

      {/* Surge Toggle */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-5 py-4 border border-gray-100">
        <div>
          <p className="text-sm font-semibold text-gray-700">Surge Pricing</p>
          <p className="text-[10px] text-gray-400">Multiply all fees during peak hours</p>
        </div>
        <div className="flex items-center gap-3">
          {config.surgeEnabled && (
            <div className="flex items-center gap-2">
              <input type="number" min={1} step={0.1} value={config.surgeMultiplier} onChange={(e) => onChange("surgeMultiplier", Number(e.target.value))} className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center font-bold outline-none focus:border-[#D62828]" />
              <span className="text-xs text-gray-400">×</span>
            </div>
          )}
          <button onClick={() => onChange("surgeEnabled", !config.surgeEnabled)} className={`relative w-11 h-6 rounded-full transition-colors ${config.surgeEnabled ? "bg-red-500" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${config.surgeEnabled ? "translate-x-5" : ""}`} />
          </button>
        </div>
      </div>

      {/* Fee Preview */}
      <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Fee Preview</p>
        <div className="grid grid-cols-4 gap-3">
          {[0, 1, 3, 5].map((extra) => {
            const km = config.baseKm + extra
            const fee = Math.round((config.baseFare + Math.max(0, extra) * config.perKmRate) * (config.surgeEnabled ? config.surgeMultiplier : 1))
            return (
              <div key={extra} className="text-center bg-white rounded-lg p-2.5 border border-gray-100">
                <p className="text-[10px] text-gray-400">{km} km</p>
                <p className="text-base font-bold text-[#D62828]">₱{fee}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
