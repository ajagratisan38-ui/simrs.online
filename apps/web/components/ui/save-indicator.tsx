'use client'

import { CheckCircle2, Loader2, CloudOff, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SaveState = 'idle' | 'saving' | 'saved' | 'saved-offline' | 'error'

interface SaveIndicatorProps {
  state: SaveState
  className?: string
}

const STATES: Record<
  SaveState,
  { icon: React.ElementType; label: string; color: string; iconClass?: string }
> = {
  idle: {
    icon: CheckCircle2,
    label: '',
    color: 'text-transparent',
  },
  saving: {
    icon: Loader2,
    label: 'Menyimpan...',
    color: 'text-teal-500',
    iconClass: 'animate-spin',
  },
  saved: {
    icon: CheckCircle2,
    label: 'Tersimpan',
    color: 'text-green-500',
  },
  'saved-offline': {
    icon: CloudOff,
    label: 'Tersimpan offline',
    color: 'text-amber-500',
  },
  error: {
    icon: AlertCircle,
    label: 'Gagal menyimpan',
    color: 'text-red-500',
  },
}

export function SaveIndicator({ state, className }: SaveIndicatorProps) {
  if (state === 'idle') return null

  const config = STATES[state]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs font-medium transition-all duration-300',
        config.color,
        className,
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.iconClass)} />
      <span>{config.label}</span>
    </div>
  )
}
