'use client'

import { useState, useEffect, useRef } from 'react'

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine)
    }

    const handleOnline = () => {
      if (mountedRef.current) setIsOnline(true)
    }
    const handleOffline = () => {
      if (mountedRef.current) setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      mountedRef.current = false
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return { isOnline }
}
