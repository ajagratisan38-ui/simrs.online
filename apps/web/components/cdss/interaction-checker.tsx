'use client'

import { useState, useCallback } from 'react'
import {
  Search,
  Plus,
  X,
  AlertTriangle,
  ShieldAlert,
  Info,
  ArrowRightLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { apiClient } from '@/lib/api/client'
import { checkPrescription, type CdssAlert } from '@/lib/api/cdss'
import { toast } from 'sonner'

interface DrugSearchResult {
  id: string
  nama: string
  nama_generik: string | null
  kode: string
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
}

const SEVERITY_BORDERS: Record<string, string> = {
  critical: 'border-red-300 dark:border-red-800',
  warning: 'border-yellow-300 dark:border-yellow-800',
  info: 'border-blue-300 dark:border-blue-800',
}

const SEVERITY_ICONS: Record<string, typeof ShieldAlert> = {
  critical: ShieldAlert,
  warning: AlertTriangle,
  info: Info,
}

export function InteractionChecker() {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<DrugSearchResult[]>([])
  const [selectedDrugs, setSelectedDrugs] = useState<DrugSearchResult[]>([])
  const [alerts, setAlerts] = useState<CdssAlert[]>([])
  const [checking, setChecking] = useState(false)
  const [searching, setSearching] = useState(false)

  const handleSearch = useCallback(async (q: string) => {
    setSearchTerm(q)
    if (q.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const res = await apiClient<{ success: boolean; data: DrugSearchResult[] }>(
        `/drugs/search?q=${encodeURIComponent(q)}&limit=10`,
      )
      setSearchResults(res.data || [])
    } catch {
      setSearchResults([])
    }
    setSearching(false)
  }, [])

  function addDrug(drug: DrugSearchResult) {
    if (selectedDrugs.some((d) => d.id === drug.id)) return
    setSelectedDrugs((prev) => [...prev, drug])
    setSearchTerm('')
    setSearchResults([])
  }

  function removeDrug(id: string) {
    setSelectedDrugs((prev) => prev.filter((d) => d.id !== id))
    setAlerts([])
  }

  async function runCheck() {
    if (selectedDrugs.length < 1) return
    setChecking(true)
    try {
      const res = await checkPrescription(selectedDrugs.map((d) => d.id))
      setAlerts(res.data || [])
      if (!res.data?.length) {
        toast.success('Tidak ditemukan interaksi atau peringatan')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal memeriksa interaksi')
    }
    setChecking(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ArrowRightLeft className="h-5 w-5" />
          Cek Interaksi Obat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search + add drugs */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari obat untuk ditambahkan..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md max-h-48 overflow-auto">
              {searchResults.map((drug) => {
                const already = selectedDrugs.some((d) => d.id === drug.id)
                return (
                  <button
                    key={drug.id}
                    onClick={() => addDrug(drug)}
                    disabled={already}
                    className={cn(
                      'w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center justify-between',
                      already && 'opacity-50',
                    )}
                  >
                    <div>
                      <span className="font-medium">{drug.nama}</span>
                      {drug.nama_generik && (
                        <span className="text-xs text-muted-foreground ml-2">
                          ({drug.nama_generik})
                        </span>
                      )}
                    </div>
                    {!already && <Plus className="h-4 w-4 text-muted-foreground" />}
                  </button>
                )
              })}
            </div>
          )}
          {searching && (
            <div className="absolute z-10 mt-1 w-full bg-popover border rounded-md shadow-md p-3 text-sm text-muted-foreground text-center">
              Mencari...
            </div>
          )}
        </div>

        {/* Selected drugs */}
        {selectedDrugs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedDrugs.map((drug) => (
              <Badge
                key={drug.id}
                variant="secondary"
                className="pl-2 pr-1 py-1 gap-1"
              >
                {drug.nama}
                <button
                  onClick={() => removeDrug(drug.id)}
                  className="ml-1 p-0.5 rounded hover:bg-black/10 dark:hover:bg-white/10"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Check button */}
        <Button
          onClick={runCheck}
          disabled={selectedDrugs.length < 1 || checking}
          className="w-full"
        >
          {checking ? 'Memeriksa...' : `Cek Interaksi (${selectedDrugs.length} obat)`}
        </Button>

        {/* Results */}
        {alerts.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium">
              Ditemukan {alerts.length} peringatan:
            </p>
            {alerts.map((alert, i) => {
              const Icon = SEVERITY_ICONS[alert.severity] || Info
              return (
                <div
                  key={i}
                  className={cn(
                    'p-3 rounded-lg border text-sm',
                    SEVERITY_BORDERS[alert.severity],
                  )}
                >
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded',
                          SEVERITY_COLORS[alert.severity],
                        )}>
                          {alert.severity === 'critical' ? 'KRITIS' : alert.severity === 'warning' ? 'PERINGATAN' : 'INFO'}
                        </span>
                        <span className="font-medium">{alert.title}</span>
                      </div>
                      <p className="text-muted-foreground">{alert.message}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {alerts.length === 0 && selectedDrugs.length > 0 && !checking && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Klik tombol di atas untuk memeriksa interaksi antar obat yang dipilih
          </p>
        )}
      </CardContent>
    </Card>
  )
}
