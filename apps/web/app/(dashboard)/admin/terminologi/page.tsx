'use client'

import { useState, useCallback } from 'react'
import {
  Search,
  BookOpen,
  Pill,
  Link2,
  Loader2,
  Check,
  AlertCircle,
  Wand2,
  ChevronRight,
  FlaskConical,
  Database,
} from 'lucide-react'
import {
  useLoincSearch,
  useLoincCategories,
  useLoincStats,
  useKfaSearch,
  useKfaCategories,
  useKfaGolongan,
  useKfaStats,
  useUnmappedLabParams,
  useUnmappedDrugs,
  useMapLabToLoinc,
  useMapDrugToKfa,
  useAutoMapDrugs,
} from '@/hooks/use-terminology'

// ===== Tab Components =====

function LoincTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('')

  const { data: results, isLoading } = useLoincSearch(searchQuery, selectedKategori || undefined)
  const { data: categories } = useLoincCategories()
  const { data: stats } = useLoincStats()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400">Total Kode LOINC</p>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.total}</p>
          </div>
          {stats.perCategory.slice(0, 3).map((cat) => (
            <div key={cat.kategori} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">{cat.kategori}</p>
              <p className="text-2xl font-bold">{cat.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kode LOINC (contoh: hemoglobin, 718-7, glucose...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={selectedKategori}
          onChange={(e) => setSelectedKategori(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background text-sm min-w-[180px]"
        >
          <option value="">Semua Kategori</option>
          {categories?.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Results Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Kode</th>
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Nama Singkat</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Kategori</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Class</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Satuan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : !searchQuery ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Ketik kata kunci untuk mencari kode LOINC
                  </td>
                </tr>
              ) : results && results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada hasil untuk &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                results?.map((loinc) => (
                  <tr key={loinc.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-primary font-medium">{loinc.code}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{loinc.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {loinc.short_name || '-'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {loinc.kategori && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                          {loinc.kategori}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {loinc.class || '-'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell font-mono text-xs">
                      {loinc.unit || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category breakdown */}
      {stats && stats.perCategory.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Distribusi per Kategori</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {stats.perCategory.map((cat) => (
              <button
                key={cat.kategori}
                onClick={() => {
                  setSelectedKategori(cat.kategori)
                  if (!searchQuery) setSearchQuery(' ')
                }}
                className="flex items-center justify-between px-3 py-2 rounded-md border text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="truncate">{cat.kategori}</span>
                <span className="text-muted-foreground ml-2">{cat.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function KfaTab() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedKategori, setSelectedKategori] = useState('')
  const [selectedGolongan, setSelectedGolongan] = useState('')

  const { data: results, isLoading } = useKfaSearch(
    searchQuery,
    selectedKategori || undefined,
    selectedGolongan || undefined,
  )
  const { data: categories } = useKfaCategories()
  const { data: golonganList } = useKfaGolongan()
  const { data: stats } = useKfaStats()

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
            <p className="text-sm text-green-600 dark:text-green-400">Total Kode KFA</p>
            <p className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.total}</p>
          </div>
          {stats.perKategori.map((cat) => (
            <div key={cat.kategori} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-muted-foreground capitalize">{cat.kategori}</p>
              <p className="text-2xl font-bold">{cat.count}</p>
            </div>
          ))}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Cari kode KFA (contoh: amoxicillin, paracetamol, spuit...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <select
          value={selectedKategori}
          onChange={(e) => setSelectedKategori(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background text-sm min-w-[140px]"
        >
          <option value="">Semua Kategori</option>
          {categories?.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
        <select
          value={selectedGolongan}
          onChange={(e) => setSelectedGolongan(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-background text-sm min-w-[160px]"
        >
          <option value="">Semua Golongan</option>
          {golonganList?.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      {/* Results Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50">
                <th className="text-left px-4 py-3 font-medium">Kode</th>
                <th className="text-left px-4 py-3 font-medium">Nama</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Kekuatan</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Bentuk Sediaan</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Kategori</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Golongan</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : !searchQuery ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Ketik kata kunci untuk mencari kode KFA
                  </td>
                </tr>
              ) : results && results.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground">
                    Tidak ada hasil untuk &quot;{searchQuery}&quot;
                  </td>
                </tr>
              ) : (
                results?.map((kfa) => (
                  <tr key={kfa.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-primary font-medium">{kfa.code}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate">{kfa.name}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {kfa.kekuatan || '-'}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {kfa.bentuk_sediaan || '-'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {kfa.kategori && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          kfa.kategori === 'obat'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : kfa.kategori === 'alkes'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                        }`}>
                          {kfa.kategori}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {kfa.golongan || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Golongan breakdown */}
      {stats && stats.perGolongan.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Distribusi per Golongan</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {stats.perGolongan.map((g) => (
              <button
                key={g.kategori}
                onClick={() => {
                  setSelectedGolongan(g.kategori)
                  if (!searchQuery) setSearchQuery(' ')
                }}
                className="flex items-center justify-between px-3 py-2 rounded-md border text-sm hover:bg-muted/50 transition-colors"
              >
                <span className="truncate">{g.kategori}</span>
                <span className="text-muted-foreground ml-2">{g.count}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ===== Inline LOINC Combobox =====
function LoincCombobox({
  value,
  onSelect,
}: {
  value: string | null
  onSelect: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { data: results, isLoading } = useLoincSearch(q)

  return (
    <div className="relative">
      {value ? (
        <button
          onClick={() => { setOpen(!open); setQ('') }}
          className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
        >
          {value}
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
        >
          Belum dipetakan
        </button>
      )}

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-background border rounded-lg shadow-lg p-2">
          <input
            type="text"
            placeholder="Cari LOINC..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full px-3 py-1.5 border rounded text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {isLoading && (
              <div className="text-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            )}
            {q && results?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Tidak ditemukan</p>
            )}
            {results?.map((r) => (
              <button
                key={r.code}
                onClick={() => {
                  onSelect(r.code)
                  setOpen(false)
                  setQ('')
                }}
                className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span className="font-mono text-primary font-medium shrink-0">{r.code}</span>
                <span className="truncate">{r.short_name || r.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground py-1"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  )
}

// ===== Inline KFA Combobox =====
function KfaCombobox({
  value,
  onSelect,
}: {
  value: string | null
  onSelect: (code: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const { data: results, isLoading } = useKfaSearch(q)

  return (
    <div className="relative">
      {value ? (
        <button
          onClick={() => { setOpen(!open); setQ('') }}
          className="font-mono text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
        >
          {value}
        </button>
      ) : (
        <button
          onClick={() => setOpen(!open)}
          className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded hover:bg-amber-100 dark:hover:bg-amber-900 transition-colors"
        >
          Belum dipetakan
        </button>
      )}

      {open && (
        <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-background border rounded-lg shadow-lg p-2">
          <input
            type="text"
            placeholder="Cari KFA..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full px-3 py-1.5 border rounded text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
            autoFocus
          />
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {isLoading && (
              <div className="text-center py-2">
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              </div>
            )}
            {q && results?.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Tidak ditemukan</p>
            )}
            {results?.map((r) => (
              <button
                key={r.code}
                onClick={() => {
                  onSelect(r.code)
                  setOpen(false)
                  setQ('')
                }}
                className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-muted transition-colors flex items-center gap-2"
              >
                <span className="font-mono text-primary font-medium shrink-0">{r.code}</span>
                <span className="truncate">{r.name}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-full mt-1 text-xs text-muted-foreground hover:text-foreground py-1"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  )
}

function MappingTab() {
  const { data: labParams, isLoading: labLoading } = useUnmappedLabParams()
  const { data: drugs, isLoading: drugsLoading } = useUnmappedDrugs()
  const mapLabMutation = useMapLabToLoinc()
  const mapDrugMutation = useMapDrugToKfa()
  const autoMapMutation = useAutoMapDrugs()

  const [savedLab, setSavedLab] = useState<Set<string>>(new Set())
  const [savedDrug, setSavedDrug] = useState<Set<string>>(new Set())

  const handleMapLab = useCallback((labKode: string, loincCode: string) => {
    mapLabMutation.mutate(
      { labKode, loincCode },
      {
        onSuccess: () => {
          setSavedLab((prev) => new Set(prev).add(labKode))
          setTimeout(() => setSavedLab((prev) => {
            const next = new Set(prev)
            next.delete(labKode)
            return next
          }), 2000)
        },
      },
    )
  }, [mapLabMutation])

  const handleMapDrug = useCallback((drugId: string, kfaCode: string) => {
    mapDrugMutation.mutate(
      { drugId, kfaCode },
      {
        onSuccess: () => {
          setSavedDrug((prev) => new Set(prev).add(drugId))
          setTimeout(() => setSavedDrug((prev) => {
            const next = new Set(prev)
            next.delete(drugId)
            return next
          }), 2000)
        },
      },
    )
  }, [mapDrugMutation])

  const labMapped = labParams?.filter((p) => p.loinc_code).length ?? 0
  const labTotal = labParams?.length ?? 0
  const drugMapped = drugs?.filter((d) => d.kfa_code).length ?? 0
  const drugTotal = drugs?.length ?? 0

  return (
    <div className="space-y-8">
      {/* Lab → LOINC */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Lab Parameter → LOINC Mapping
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Petakan parameter lab ke kode LOINC untuk integrasi SATUSEHAT
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-medium ${labMapped === labTotal && labTotal > 0 ? 'text-green-600' : 'text-amber-600'}`}>
              {labMapped} / {labTotal} terpetakan
            </span>
            {labTotal > 0 && (
              <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(labMapped / labTotal) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Kode</th>
                  <th className="text-left px-4 py-3 font-medium">Nama Parameter</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium">Kode LOINC</th>
                  <th className="text-left px-4 py-3 font-medium w-10">Status</th>
                </tr>
              </thead>
              <tbody>
                {labLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : labParams?.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-muted-foreground">
                      Tidak ada parameter lab
                    </td>
                  </tr>
                ) : (
                  labParams?.map((param) => (
                    <tr key={param.kode} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{param.kode}</td>
                      <td className="px-4 py-3">{param.nama}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {param.kategori}
                      </td>
                      <td className="px-4 py-3">
                        <LoincCombobox
                          value={param.loinc_code}
                          onSelect={(code) => handleMapLab(param.kode, code)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {savedLab.has(param.kode) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : param.loinc_code ? (
                          <Check className="h-4 w-4 text-green-500/50" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500/50" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Drug → KFA */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold flex items-center gap-2">
              <Pill className="h-4 w-4" />
              Obat → KFA Mapping
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Petakan obat ke kode KFA (Kode Farmasi dan Alkes) Kemenkes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => autoMapMutation.mutate()}
              disabled={autoMapMutation.isPending}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {autoMapMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4" />
              )}
              Auto-Match
            </button>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${drugMapped === drugTotal && drugTotal > 0 ? 'text-green-600' : 'text-amber-600'}`}>
                {drugMapped} / {drugTotal} terpetakan
              </span>
              {drugTotal > 0 && (
                <div className="w-24 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(drugMapped / drugTotal) * 100}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auto-map result */}
        {autoMapMutation.data && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-700 dark:text-green-300">
              Auto-match selesai: {autoMapMutation.data.mapped} dari {autoMapMutation.data.total} obat berhasil dipetakan
            </p>
            {autoMapMutation.data.details.length > 0 && (
              <ul className="mt-2 space-y-1">
                {autoMapMutation.data.details.slice(0, 5).map((d) => (
                  <li key={d.drugId} className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <ChevronRight className="h-3 w-3" />
                    {d.drugName} → <span className="font-mono">{d.kfaCode}</span> ({d.kfaName})
                  </li>
                ))}
                {autoMapMutation.data.details.length > 5 && (
                  <li className="text-xs text-green-500">
                    ... dan {autoMapMutation.data.details.length - 5} lainnya
                  </li>
                )}
              </ul>
            )}
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Kode</th>
                  <th className="text-left px-4 py-3 font-medium">Nama Obat</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Generik</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Kategori</th>
                  <th className="text-left px-4 py-3 font-medium">Kode KFA</th>
                  <th className="text-left px-4 py-3 font-medium w-10">Status</th>
                </tr>
              </thead>
              <tbody>
                {drugsLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : drugs?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      Tidak ada obat
                    </td>
                  </tr>
                ) : (
                  drugs?.map((drug) => (
                    <tr key={drug.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs">{drug.kode}</td>
                      <td className="px-4 py-3">{drug.nama}</td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                        {drug.nama_generik || '-'}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
                          drug.kategori === 'obat'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                            : drug.kategori === 'alkes'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                        }`}>
                          {drug.kategori}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <KfaCombobox
                          value={drug.kfa_code}
                          onSelect={(code) => handleMapDrug(drug.id, code)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {savedDrug.has(drug.id) ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : drug.kfa_code ? (
                          <Check className="h-4 w-4 text-green-500/50" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500/50" />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ===== Main Page =====

type TabId = 'loinc' | 'kfa' | 'mapping'

const TABS: Array<{ id: TabId; label: string; icon: typeof BookOpen; desc: string }> = [
  { id: 'loinc', label: 'LOINC', icon: FlaskConical, desc: 'Kode observasi laboratorium' },
  { id: 'kfa', label: 'KFA', icon: Pill, desc: 'Kode farmasi dan alkes' },
  { id: 'mapping', label: 'Mapping', icon: Link2, desc: 'Pemetaan terminologi' },
]

export default function TerminologiPage() {
  const [activeTab, setActiveTab] = useState<TabId>('loinc')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6" />
          Terminologi Medis
        </h1>
        <p className="text-muted-foreground mt-1">
          Kelola kode LOINC (Laboratorium) dan KFA (Farmasi & Alkes) untuk standarisasi dan integrasi SATUSEHAT
        </p>
      </div>

      {/* Info card */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
        <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <p className="font-medium">Tentang Terminologi Medis</p>
          <p className="mt-1">
            <strong>LOINC</strong> (Logical Observation Identifiers Names and Codes) adalah standar internasional
            untuk identifikasi hasil laboratorium, tanda vital, dan observasi klinis.{' '}
            <strong>KFA</strong> (Kode Farmasi dan Alkes) adalah standar Kemenkes Indonesia untuk
            identifikasi obat dan alat kesehatan. Keduanya diperlukan untuk integrasi SATUSEHAT FHIR.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 border-b">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
              <span className="hidden sm:inline text-xs text-muted-foreground">
                — {tab.desc}
              </span>
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'loinc' && <LoincTab />}
        {activeTab === 'kfa' && <KfaTab />}
        {activeTab === 'mapping' && <MappingTab />}
      </div>
    </div>
  )
}
