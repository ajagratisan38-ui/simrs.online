'use client'

import { ShieldAlert, AlertTriangle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface HighAlertBadgeProps {
  isHighAlert?: boolean
  isLasa?: boolean
  isNorum?: boolean
  highAlertCategory?: string | null
  specialInstructions?: string | null
  compact?: boolean
  className?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  elektrolit_konsentrat: 'Elektrolit Konsentrat',
  antikoagulan: 'Antikoagulan',
  insulin: 'Insulin',
  opioid: 'Opioid',
  kemoterapi: 'Kemoterapi',
  muscle_relaxant: 'Pelemas Otot',
  agonis_adrenergik: 'Agonis Adrenergik',
  sedasi: 'Sedasi',
}

export function HighAlertBadge({
  isHighAlert,
  isLasa,
  isNorum,
  highAlertCategory,
  specialInstructions,
  compact,
  className,
}: HighAlertBadgeProps) {
  const badges: Array<{
    label: string
    bg: string
    icon: typeof ShieldAlert
    tooltip: string
  }> = []

  if (isHighAlert) {
    const catLabel = highAlertCategory ? CATEGORY_LABELS[highAlertCategory] || highAlertCategory : null
    badges.push({
      label: compact ? 'HA' : 'HIGH ALERT',
      bg: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-red-200 dark:border-red-800',
      icon: ShieldAlert,
      tooltip: `Obat High-Alert${catLabel ? ` — ${catLabel}` : ''}${specialInstructions ? `\n${specialInstructions}` : ''}`,
    })
  }

  if (isLasa) {
    badges.push({
      label: 'LASA',
      bg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-orange-200 dark:border-orange-800',
      icon: AlertTriangle,
      tooltip: 'Look-Alike Sound-Alike — Obat dengan nama yang mirip, perhatikan saat dispensing',
    })
  }

  if (isNorum) {
    badges.push({
      label: 'NORUM',
      bg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: AlertTriangle,
      tooltip: 'Nama Obat Rupa Ucapan Mirip — Perhatikan kemiripan nama dan kemasan',
    })
  }

  if (!badges.length) return null

  return (
    <TooltipProvider>
      <div className={cn('inline-flex items-center gap-1', className)}>
        {badges.map((badge) => {
          const Icon = badge.icon
          return (
            <Tooltip key={badge.label}>
              <TooltipTrigger asChild>
                <span
                  className={cn(
                    'inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border cursor-help',
                    badge.bg,
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {badge.label}
                </span>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs whitespace-pre-wrap">
                {badge.tooltip}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
