'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Upload, FileSpreadsheet, Download, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { apiClient } from '@/lib/api/client'
import { toast } from 'sonner'

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: Array<{ row: number; error: string }>
}

export default function ImportPage() {
  const [importType, setImportType] = useState<'patients' | 'drugs'>('patients')
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImport = async () => {
    const file = fileRef.current?.files?.[0]
    if (!file) {
      toast.error('Pilih file CSV terlebih dahulu')
      return
    }

    setIsImporting(true)
    setResult(null)

    try {
      const text = await file.text()
      const res = await apiClient<{ success: boolean; data: ImportResult }>(`/import/${importType}`, {
        method: 'POST',
        body: JSON.stringify({ csv: text }),
      })
      setResult(res.data)

      if (res.data.imported > 0) {
        toast.success(`${res.data.imported} data berhasil diimpor`)
      }
      if (res.data.skipped > 0) {
        toast.warning(`${res.data.skipped} data dilewati`)
      }
    } catch (error) {
      toast.error('Gagal mengimpor data')
    } finally {
      setIsImporting(false)
    }
  }

  const downloadTemplate = async () => {
    try {
      const res = await apiClient<{ success: boolean; data: Record<string, { headers: string[]; example: string }> }>('/import/templates')
      const template = res.data[importType]
      if (!template) return
      const csvContent = template.headers.join(',') + '\n' + template.example
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template-${importType}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Gagal mengunduh template')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Upload className="h-6 w-6 text-purple-600" />
          Import Data CSV
        </h1>
        <p className="text-muted-foreground">Impor data pasien atau obat dari file CSV</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Upload CSV
            </CardTitle>
            <CardDescription>
              Pilih tipe data dan unggah file CSV. Pastikan format sesuai template.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Tipe Data</label>
              <Select
                value={importType}
                onChange={(e) => setImportType(e.target.value as 'patients' | 'drugs')}
              >
                <option value="patients">Pasien</option>
                <option value="drugs">Obat</option>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">File CSV</label>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90"
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={handleImport} disabled={isImporting} className="flex-1">
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Mengimpor...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Template
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Hasil Import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{result.total}</div>
                  <div className="text-sm text-muted-foreground">Total Baris</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                    <CheckCircle className="h-5 w-5" />
                    {result.imported}
                  </div>
                  <div className="text-sm text-green-700">Berhasil</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 flex items-center justify-center gap-1">
                    <XCircle className="h-5 w-5" />
                    {result.skipped}
                  </div>
                  <div className="text-sm text-red-700">Dilewati</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Detail Error:</h4>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {result.errors.map((err, idx) => (
                      <div key={idx} className="text-sm flex items-start gap-2 p-2 bg-red-50 rounded">
                        <Badge variant="destructive" className="shrink-0">
                          Baris {err.row}
                        </Badge>
                        <span className="text-red-700">{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
