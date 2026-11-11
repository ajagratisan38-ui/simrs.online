'use client'

import { useState, useCallback, useRef } from 'react'
import type { SaveState } from '@/components/ui/save-indicator'
import { toast } from 'sonner'

interface UseAutoSaveOptions {
  onlineLabel?: string
  offlineLabel?: string
}

/**
 * Hook for tracking save state with auto-hide and offline-aware toasts.
 *
 * Usage:
 * ```
 * const { saveState, markSaving, markSaved, markOffline, markError } = useAutoSave()
 *
 * function onSubmit(data) {
 *   markSaving()
 *   mutation.mutate(data, {
 *     onSuccess: () => markSaved(),
 *     onError: () => markError(),
 *   })
 * }
 *
 * <SaveIndicator state={saveState} />
 * ```
 */
export function useAutoSave(options?: UseAutoSaveOptions) {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const markSaving = useCallback(() => {
    clearTimer()
    setSaveState('saving')
  }, [clearTimer])

  const markSaved = useCallback(
    (message?: string) => {
      clearTimer()
      setSaveState('saved')
      if (message) {
        toast.success(message)
      }
      timerRef.current = setTimeout(() => setSaveState('idle'), 3000)
    },
    [clearTimer],
  )

  const markOffline = useCallback(
    (message?: string) => {
      clearTimer()
      setSaveState('saved-offline')
      toast.info(
        message ||
          options?.offlineLabel ||
          'Data disimpan offline, akan dikirim saat internet tersedia',
        { duration: 4000 },
      )
      timerRef.current = setTimeout(() => setSaveState('idle'), 5000)
    },
    [clearTimer, options?.offlineLabel],
  )

  const markError = useCallback(
    (message?: string) => {
      clearTimer()
      setSaveState('error')
      if (message) {
        toast.error(message)
      }
      timerRef.current = setTimeout(() => setSaveState('idle'), 5000)
    },
    [clearTimer],
  )

  return {
    saveState,
    markSaving,
    markSaved,
    markOffline,
    markError,
  }
}
