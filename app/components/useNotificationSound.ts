"use client"

import { useRef, useEffect, useCallback } from "react"

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const interacted = useRef(false)

  useEffect(() => {
    const enable = () => { interacted.current = true }
    window.addEventListener("click", enable, { once: true })
    window.addEventListener("touchstart", enable, { once: true })
    return () => {
      window.removeEventListener("click", enable)
      window.removeEventListener("touchstart", enable)
    }
  }, [])

  const play = useCallback(() => {
    if (!interacted.current) return
    try {
      if (!audioRef.current) audioRef.current = new Audio("/sounds/notification.wav")
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
    } catch {}
  }, [])

  return play
}
