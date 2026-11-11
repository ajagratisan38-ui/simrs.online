'use client'

import { useState, useRef, useCallback } from 'react'
import { Calendar } from 'lucide-react'
import { Input } from './input'

function isoToDisplay(iso: string): string {
  if (!iso) return ''
  const p = iso.split('T')[0].split('-')
  if (p.length !== 3) return iso
  return `${p[2]}/${p[1]}/${p[0]}`
}

export function formatTanggal(dateStr: string | null | undefined): string {
  if (!dateStr) return '-'
  const p = dateStr.split('T')[0].split('-')
  if (p.length !== 3) return dateStr
  return `${p[2]}/${p[1]}/${p[0]}`
}

export function DateInput({ value, onChange, className }: {
  value: string
  onChange: (isoValue: string) => void
  className?: string
}) {
  const [display, setDisplay] = useState(() => isoToDisplay(value))

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9]/g, '')
    if (raw.length > 8) raw = raw.slice(0, 8)

    let formatted = ''
    if (raw.length > 0) formatted = raw.slice(0, 2)
    if (raw.length > 2) formatted += '/' + raw.slice(2, 4)
    if (raw.length > 4) formatted += '/' + raw.slice(4, 8)

    setDisplay(formatted)

    if (raw.length === 8) {
      const dd = raw.slice(0, 2)
      const mm = raw.slice(2, 4)
      const yyyy = raw.slice(4, 8)
      const d = parseInt(dd), m = parseInt(mm), y = parseInt(yyyy)
      if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
        onChange(`${yyyy}-${mm}-${dd}`)
      }
    } else if (raw.length === 0) {
      onChange('')
    }
  }, [onChange])

  const handleCalendarPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value
    if (iso) {
      setDisplay(isoToDisplay(iso))
      onChange(iso)
    }
  }, [onChange])

  return (
    <div className={`relative ${className || ''}`}>
      <Input
        value={display}
        onChange={handleTextChange}
        placeholder="dd/mm/yyyy"
        maxLength={10}
        inputMode="numeric"
        className="pr-10"
      />
      <input
        type="date"
        value={value || ''}
        onChange={handleCalendarPick}
        className="absolute right-0 top-0 h-full w-10 opacity-0 cursor-pointer"
        tabIndex={-1}
      />
      <Calendar
        className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
      />
    </div>
  )
}
