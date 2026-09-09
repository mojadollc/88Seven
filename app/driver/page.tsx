"use client"

export default function DriverPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#1F2937] to-[#111827] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-6 text-4xl">
        🏍️
      </div>
      <h1 className="text-white text-2xl font-black mb-2">Rider App</h1>
      <p className="text-white/60 text-sm mb-8 max-w-xs">
        All Gruwcer deliveries are handled through the BitRide platform.
        Please use the BitRide app to accept and manage your deliveries.
      </p>

      <a
        href="https://bitride-41c11.web.app/"
        target="_blank"
        className="w-full max-w-xs bg-[#319F44] text-white py-4 rounded-2xl font-bold text-base hover:bg-[#267a34] transition-colors flex items-center justify-center gap-2 shadow-lg shadow-[#319F44]/30"
      >
        Open BitRide App ↗
      </a>

      <div className="mt-8 bg-white/5 rounded-2xl p-5 max-w-xs w-full text-left space-y-3">
        <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">What BitRide handles</p>
        {[
          ["👤", "Rider registration & profile"],
          ["💰", "Wallet top-up & earnings"],
          ["📊", "Commission deductions"],
          ["📦", "Delivery task acceptance"],
          ["📍", "Live location tracking"],
        ].map(([icon, label]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="text-lg">{icon}</span>
            <span className="text-white/70 text-sm">{label}</span>
          </div>
        ))}
      </div>

      <p className="text-white/30 text-xs mt-8">
        Gruwcer pushes bookings to BitRide automatically when orders are confirmed.
      </p>
    </main>
  )
}
