'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { usePatients } from '@/hooks/use-patients'
import { cn } from '@/lib/utils'
import type { Patient } from '@simrs/shared-types'

interface PatientSearchProps {
  onSelect?: (patient: Patient) => void
  navigateOnSelect?: boolean
  placeholder?: string
  className?: string
}

export function PatientSearch({
  onSelect,
  navigateOnSelect = true,
  placeholder = 'Cari pasien (nama, NIK, No RM)...',
  className,
}: PatientSearchProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Debounce 500ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const { data, isLoading } = usePatients({
    search: debouncedSearch,
    limit: 8,
    page: 1,
  })

  const results = data?.data ?? []
  const showDropdown = open && search.length >= 2

  function handleSelect(patient: Patient) {
    setOpen(false)
    setSearch('')
    if (onSelect) {
      onSelect(patient)
    }
    if (navigateOnSelect) {
      router.push(`/pasien/${patient.id}`)
    }
  }

  return (
    <div ref={wrapperRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => search.length >= 2 && setOpen(true)}
          placeholder={placeholder}
          className="pl-10"
        />
      </div>

      {showDropdown && (
        <div className="absolute z-50 top-full mt-1 w-full rounded-md border bg-popover shadow-md">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Mencari...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Tidak ditemukan
            </div>
          ) : (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(p)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors"
                  >
                    <p className="text-sm font-medium">{p.nama}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.no_rekam_medis} &middot; NIK: {p.nik}
                      {p.no_bpjs && ` · BPJS: ${p.no_bpjs}`}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
