'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ShieldAlert,
  Info,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { CdssAlert } from '@/lib/api/cdss'

interface CdssAlertBannerProps {
  alerts: CdssAlert[]
  onOverride?: (alert: CdssAlert, reason: string) => void
  overridePending?: boolean
  className?: string
}

const SEVERITY_CONFIG = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800',
    icon: ShieldAlert,
    iconColor: 'text-red-600 dark:text-red-400',
    textColor: 'text-red-800 dark:text-red-200',
    badgeBg: 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300',
    label: 'KRITIS',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800',
    icon: AlertTriangle,
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    textColor: 'text-yellow-800 dark:text-yellow-200',
    badgeBg: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300',
    label: 'PERINGATAN',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    textColor: 'text-blue-800 dark:text-blue-200',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
    label: 'INFO',
  },
}

export function CdssAlertBanner({
  alerts,
  onOverride,
  overridePending,
  className,
}: CdssAlertBannerProps) {
  const [dismissed, setDismissed] = useState<Set<number>>(new Set())
  const [expanded, setExpanded] = useState(true)
  const [overrideDialog, setOverrideDialog] = useState<{ alert: CdssAlert; index: number } | null>(null)
  const [overrideReason, setOverrideReason] = useState('')

  if (!alerts.length) return null

  const visibleAlerts = alerts.filter((_, i) => !dismissed.has(i))
  if (!visibleAlerts.length) return null

  const criticalCount = visibleAlerts.filter((a) => a.severity === 'critical').length
  const warningCount = visibleAlerts.filter((a) => a.severity === 'warning').length

  function handleDismiss(index: number) {
    const alert = alerts[index]
    if (alert.severity === 'critical') return // cannot dismiss critical without override
    setDismissed((prev) => new Set(prev).add(index))
  }

  function handleOverrideSubmit() {
    if (!overrideDialog || !onOverride) return
    onOverride(overrideDialog.alert, overrideReason)
    setDismissed((prev) => new Set(prev).add(overrideDialog.index))
    setOverrideDialog(null)
    setOverrideReason('')
  }

  return (
    <div className={cn('space-y-2', className)}>
      {/* Summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between p-3 rounded-lg border text-sm font-medium',
          criticalCount > 0
            ? 'bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-800 text-red-800 dark:text-red-200'
            : warningCount > 0
              ? 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
              : 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-800 text-blue-800 dark:text-blue-200',
        )}
      >
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          <span>
            CDSS: {visibleAlerts.length} peringatan ditemukan
            {criticalCount > 0 && ` (${criticalCount} kritis)`}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {/* Individual alerts */}
      {expanded && visibleAlerts.map((alert, vi) => {
        const originalIndex = alerts.indexOf(alert)
        const config = SEVERITY_CONFIG[alert.severity]
        const Icon = config.icon

        return (
          <div
            key={`${alert.alert_type}-${vi}`}
            className={cn(
              'flex items-start gap-3 p-3 rounded-lg border',
              config.bg,
            )}
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', config.iconColor)} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', config.badgeBg)}>
                  {config.label}
                </span>
                <span className={cn('text-sm font-semibold', config.textColor)}>
                  {alert.title}
                </span>
              </div>
              <p className={cn('text-sm', config.textColor)}>
                {alert.message}
              </p>
              {alert.drug_names.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {alert.drug_names.map((name, di) => (
                    <span
                      key={di}
                      className="text-xs px-2 py-0.5 rounded-full bg-white/60 dark:bg-black/20 font-medium"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {alert.severity === 'critical' && onOverride ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-100"
                  onClick={() => {
                    setOverrideDialog({ alert, index: originalIndex })
                    setOverrideReason('')
                  }}
                >
                  Override
                </Button>
              ) : alert.severity !== 'critical' ? (
                <button
                  onClick={() => handleDismiss(originalIndex)}
                  className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </div>
        )
      })}

      {/* Override dialog */}
      <Dialog open={!!overrideDialog} onOpenChange={(open) => !open && setOverrideDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Override Alert Kritis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {overrideDialog && (
              <div className="p-3 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800 text-sm">
                <p className="font-semibold text-red-800 dark:text-red-200 mb-1">
                  {overrideDialog.alert.title}
                </p>
                <p className="text-red-700 dark:text-red-300">
                  {overrideDialog.alert.message}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Alasan Override <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Jelaskan alasan klinis mengapa peringatan ini di-override..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Minimal 5 karakter. Alasan akan dicatat dalam audit trail.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOverrideDialog(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleOverrideSubmit}
              disabled={overrideReason.trim().length < 5 || overridePending}
            >
              {overridePending ? 'Memproses...' : 'Konfirmasi Override'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
