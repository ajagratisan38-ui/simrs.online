'use client'

import { CheckCircle2, Clock, XCircle, Cloud } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SatusehatStatusBadgeProps {
  status: 'not_required' | 'pending' | 'sent' | 'failed'
  encounterId?: string | null
  errorMessage?: string
  className?: string
}

const CONFIG: Record<string, {
  label: string
  variant: 'success' | 'warning' | 'destructive' | 'secondary'
  icon: typeof CheckCircle2
  tooltip: string
}> = {
  sent: {
    label: 'SATUSEHAT',
    variant: 'success',
    icon: CheckCircle2,
    tooltip: 'Data terkirim ke SATUSEHAT',
  },
  pending: {
    label: 'SATUSEHAT',
    variant: 'warning',
    icon: Clock,
    tooltip: 'Menunggu sinkronisasi ke SATUSEHAT',
  },
  failed: {
    label: 'SATUSEHAT',
    variant: 'destructive',
    icon: XCircle,
    tooltip: 'Gagal sinkronisasi ke SATUSEHAT',
  },
  not_required: {
    label: 'SATUSEHAT',
    variant: 'secondary',
    icon: Cloud,
    tooltip: 'Sinkronisasi tidak diperlukan',
  },
}

export function SatusehatStatusBadge({
  status,
  encounterId,
  errorMessage,
  className,
}: SatusehatStatusBadgeProps) {
  const cfgEntry = CONFIG[status]
  const label = cfgEntry?.label ?? 'SATUSEHAT'
  const variant = cfgEntry?.variant ?? 'secondary'
  const Icon = cfgEntry?.icon ?? Cloud
  const tooltip = cfgEntry?.tooltip ?? ''

  const statusSymbol = status === 'sent' ? ' ✓' : status === 'pending' ? ' ⏳' : status === 'failed' ? ' ✕' : ''

  return (
    <div className={`relative group ${className || ''}`}>
      <Badge variant={variant} className="gap-1 cursor-default">
        <Icon className="h-3 w-3" />
        {label}{statusSymbol}
      </Badge>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
        <div className="bg-popover text-popover-foreground border rounded-md shadow-md px-3 py-2 text-xs max-w-60 whitespace-normal">
          <p className="font-medium mb-0.5">{tooltip}</p>
          {encounterId && (
            <p className="text-muted-foreground">
              Encounter ID: <span className="font-mono">{encounterId}</span>
            </p>
          )}
          {errorMessage && status === 'failed' && (
            <p className="text-red-500 mt-1">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  )
}
