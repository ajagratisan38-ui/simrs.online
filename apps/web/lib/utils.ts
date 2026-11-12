import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatRupiah(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return 'Rp 0'
  const num = Math.round(Number(n) || 0)
  return rupiahFormatter.format(num)
}

export function formatRupiahAccounting(n: number | string | null | undefined): string {
  if (n === null || n === undefined) return 'Rp 0'
  const num = Math.round(Number(n) || 0)
  const formatted = rupiahFormatter.format(Math.abs(num))
  return num < 0 ? `(${formatted})` : formatted
}

export const formatCurrency = formatRupiah

/**
 * Format tanggal ke format Indonesia dd/mm/yyyy
 * Gunakan ini daripada toLocaleDateString langsung agar konsisten
 */
export function formatDate(
  date: string | Date | null | undefined,
  opts?: {
    format?: 'short' | 'medium' | 'long' | 'full'
    withTime?: boolean
  },
): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '-'

  const format = opts?.format ?? 'short'

  const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  }

  const dateOpts = { ...optionsMap[format] }
  if (opts?.withTime) {
    Object.assign(dateOpts, { hour: '2-digit', minute: '2-digit' })
  }

  return d.toLocaleDateString('id-ID', dateOpts)
}

/**
 * Returns today's date as YYYY-MM-DD in local timezone (browser).
 * Use this instead of `new Date().toISOString().split('T')[0]` which returns UTC date.
 */
export function getTodayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
