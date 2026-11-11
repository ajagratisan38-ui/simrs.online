'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Search, X, Star } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useICD10Search } from '@/hooks/use-medical-record'
import { cn } from '@/lib/utils'
import type { DiagnosisInput } from '@/lib/api/medical-records'

interface DiagnosisPickerProps {
  diagnoses: DiagnosisInput[]
  onChange: (diagnoses: DiagnosisInput[]) => void
  disabled?: boolean
}

export function DiagnosisPicker({
  diagnoses,
  onChange,
  disabled,
}: DiagnosisPickerProps) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Debounce search 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data: searchResult, isLoading } = useICD10Search(debouncedQuery)
  const results = searchResult?.data ?? []

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const addDiagnosis = useCallback(
    (code: string, nameId: string) => {
      // Don't add duplicates
      if (diagnoses.some((d) => d.icd10_code === code)) return

      const tipe: 'utama' | 'sekunder' =
        diagnoses.length === 0 ? 'utama' : 'sekunder'

      onChange([...diagnoses, { icd10_code: code, icd10_name: nameId, tipe }])
      setQuery('')
      setShowDropdown(false)
    },
    [diagnoses, onChange],
  )

  const removeDiagnosis = useCallback(
    (index: number) => {
      const updated = diagnoses.filter((_, i) => i !== index)
      // If we removed the primary and there are others, make the first one primary
      if (
        diagnoses[index]?.tipe === 'utama' &&
        updated.length > 0 &&
        !updated.some((d) => d.tipe === 'utama')
      ) {
        updated[0] = { ...updated[0]!, tipe: 'utama', icd10_code: updated[0]!.icd10_code ?? '', icd10_name: updated[0]!.icd10_name ?? '' }
      }
      onChange(updated)
    },
    [diagnoses, onChange],
  )

  const toggleTipe = useCallback(
    (index: number) => {
      const updated = diagnoses.map((d, i) => {
        if (i === index) {
          return { ...d, tipe: d.tipe === 'utama' ? 'sekunder' as const : 'utama' as const }
        }
        // If setting this one as utama, demote previous utama
        if (diagnoses[index]?.tipe === 'sekunder' && d.tipe === 'utama') {
          return { ...d, tipe: 'sekunder' as const }
        }
        return d
      })
      onChange(updated)
    },
    [diagnoses, onChange],
  )

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Diagnosis (ICD-10)</label>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          placeholder="Cari kode atau nama diagnosis..."
          className="pl-9"
          disabled={disabled}
        />

        {/* Dropdown */}
        {showDropdown && debouncedQuery.length >= 2 && (
          <div
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg"
          >
            {isLoading ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Mencari...
              </div>
            ) : results.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground text-center">
                Tidak ditemukan
              </div>
            ) : (
              results.map((r) => {
                const alreadyAdded = diagnoses.some(
                  (d) => d.icd10_code === r.code,
                )
                return (
                  <button
                    key={r.id}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => addDiagnosis(r.code, r.name_id)}
                    className={cn(
                      'w-full text-left px-3 py-2 hover:bg-accent text-sm border-b last:border-0',
                      alreadyAdded && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    <span className="font-mono font-medium text-primary">
                      {r.code}
                    </span>
                    <span className="ml-2">{r.name_id}</span>
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({r.name_en})
                    </span>
                    {r.category && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        {r.category}
                      </Badge>
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {/* Selected diagnoses list */}
      {diagnoses.length > 0 && (
        <div className="space-y-2">
          {diagnoses.map((dx, i) => (
            <div
              key={`${dx.icd10_code}-${i}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md border',
                dx.tipe === 'utama'
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border',
              )}
            >
              <button
                type="button"
                onClick={() => toggleTipe(i)}
                disabled={disabled}
                title={
                  dx.tipe === 'utama'
                    ? 'Diagnosis utama'
                    : 'Klik untuk jadikan utama'
                }
              >
                <Star
                  className={cn(
                    'h-4 w-4',
                    dx.tipe === 'utama'
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground',
                  )}
                />
              </button>
              <span className="font-mono text-sm font-medium">
                {dx.icd10_code}
              </span>
              <span className="text-sm flex-1 truncate">{dx.icd10_name}</span>
              <Badge
                variant={dx.tipe === 'utama' ? 'default' : 'secondary'}
                className="text-[10px] shrink-0"
              >
                {dx.tipe}
              </Badge>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => removeDiagnosis(i)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
