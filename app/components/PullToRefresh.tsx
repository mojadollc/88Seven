"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

export default function PullToRefresh({ children, onRefresh }: { children: ReactNode; onRefresh?: () => Promise<void> | void }) {
  const [pulling, setPulling] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const startY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const threshold = 80

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let touching = false

    const handleTouchStart = (e: TouchEvent) => {
      // Only trigger if scrolled to top
      if (container.scrollTop > 0) return
      const scrollParent = getScrollParent(e.target as HTMLElement)
      if (scrollParent && scrollParent !== container && scrollParent.scrollTop > 0) return
      startY.current = e.touches[0].clientY
      touching = true
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touching || refreshing) return
      const deltaY = e.touches[0].clientY - startY.current
      if (deltaY > 0 && container.scrollTop === 0) {
        e.preventDefault()
        const dist = Math.min(deltaY * 0.5, 120)
        setPullDistance(dist)
        setPulling(dist >= threshold)
      }
    }

    const handleTouchEnd = async () => {
      if (!touching) return
      touching = false
      if (pulling && pullDistance >= threshold) {
        setRefreshing(true)
        setPullDistance(threshold)
        try {
          if (onRefresh) await onRefresh()
          else window.location.reload()
        } catch {}
        setRefreshing(false)
      }
      setPulling(false)
      setPullDistance(0)
    }

    container.addEventListener("touchstart", handleTouchStart, { passive: true })
    container.addEventListener("touchmove", handleTouchMove, { passive: false })
    container.addEventListener("touchend", handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener("touchstart", handleTouchStart)
      container.removeEventListener("touchmove", handleTouchMove)
      container.removeEventListener("touchend", handleTouchEnd)
    }
  }, [pulling, pullDistance, refreshing, onRefresh])

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-auto">
      {/* Pull indicator */}
      <div
        className="absolute left-0 right-0 flex items-center justify-center z-[100] transition-all pointer-events-none"
        style={{ top: 0, height: `${pullDistance}px`, opacity: pullDistance > 10 ? 1 : 0 }}
      >
        <div className={`w-9 h-9 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center transition-transform ${refreshing ? "animate-spin" : ""}`}
          style={{ transform: refreshing ? undefined : `rotate(${pullDistance * 3}deg)` }}
        >
          {refreshing ? (
            <svg className="w-5 h-5 text-[#D62828]" fill="none" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className={`w-5 h-5 transition-colors ${pulling ? "text-[#D62828]" : "text-gray-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          )}
        </div>
      </div>
      {/* Content shifted down during pull */}
      <div style={{ transform: `translateY(${pullDistance}px)`, transition: pullDistance === 0 && !refreshing ? "transform 0.3s ease" : "none" }}>
        {children}
      </div>
    </div>
  )
}

function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  while (el) {
    if (el.scrollTop > 0) return el
    const style = getComputedStyle(el)
    if (style.overflow === "auto" || style.overflow === "scroll" || style.overflowY === "auto" || style.overflowY === "scroll") {
      if (el.scrollTop > 0) return el
    }
    el = el.parentElement
  }
  return null
}
