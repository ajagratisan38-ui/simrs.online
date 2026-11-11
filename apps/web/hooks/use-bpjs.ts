import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getPeserta,
  getPesertaByNik,
  getRujukan,
  createSep,
  getSep,
  deleteSep,
  searchPoli,
  searchDiagnosa,
  getSepQuota,
  checkSepQuota,
  searchProsedur,
  searchFaskes,
  searchDokterBpjs,
  getSpesialistik,
  getKunjunganBulanan,
  pcareGetKunjungan,
  pcareGetRiwayatKunjungan,
  pcareSearchObat,
  pcareCreatePendaftaran,
  pcareCreateKunjungan,
  eklaimGrouping,
  eklaimGetClaim,
  eklaimListClaims,
  eklaimGetClaimStatus,
  eklaimDeleteClaim,
  aplicareGetBedAvailability,
  antrolRefPoli,
  antrolRefDokter,
  antrolGetJadwalDokter,
  antrolTambahAntrean,
  antrolUpdateAntrean,
  antrolBatalAntrean,
  antrolGetListTask,
  antrolSyncTasks,
  antrolGetDashboard,
  type CreateSepInput,
  type AntrolUpdateInput,
  type AntrolBatalInput,
  type AntrolAddInput,
} from '@/lib/api/bpjs'
import { toast } from 'sonner'

export function useBpjsPeserta(noBpjs: string | undefined) {
  return useQuery({
    queryKey: ['bpjs-peserta', noBpjs],
    queryFn: () => getPeserta(noBpjs!),
    enabled: !!noBpjs && noBpjs.length >= 10,
    staleTime: 60_000,
    retry: 1,
  })
}

export function useBpjsPesertaByNik(nik: string | undefined) {
  return useQuery({
    queryKey: ['bpjs-peserta-nik', nik],
    queryFn: () => getPesertaByNik(nik!),
    enabled: !!nik && nik.length === 16,
    staleTime: 60_000,
    retry: 1,
  })
}

export function useBpjsRujukan(noKartu: string | undefined) {
  return useQuery({
    queryKey: ['bpjs-rujukan', noKartu],
    queryFn: () => getRujukan(noKartu!),
    enabled: !!noKartu && noKartu.length >= 10,
    staleTime: 60_000,
    retry: 1,
  })
}

export function useCreateSep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSepInput) => createSep(data),
    onSuccess: () => {
      toast.success('SEP berhasil dibuat')
      qc.invalidateQueries({ queryKey: ['bpjs-sep'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal membuat SEP: ${err.message}`)
    },
  })
}

export function useBpjsSep(noSep: string | undefined) {
  return useQuery({
    queryKey: ['bpjs-sep', noSep],
    queryFn: () => getSep(noSep!),
    enabled: !!noSep && noSep.length >= 10,
    staleTime: 30_000,
  })
}

export function useDeleteSep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noSep, user }: { noSep: string; user: string }) =>
      deleteSep(noSep, user),
    onSuccess: () => {
      toast.success('SEP berhasil dihapus')
      qc.invalidateQueries({ queryKey: ['bpjs-sep'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal menghapus SEP: ${err.message}`)
    },
  })
}

export function useSepQuota() {
  return useQuery({
    queryKey: ['bpjs-sep-quota'],
    queryFn: getSepQuota,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useSepQuotaCheck(isIGD = false, enabled = true) {
  return useQuery({
    queryKey: ['bpjs-sep-quota-check', isIGD],
    queryFn: () => checkSepQuota(isIGD),
    enabled,
    staleTime: 15_000,
  })
}

export function useBpjsSearchPoli(keyword: string) {
  return useQuery({
    queryKey: ['bpjs-poli', keyword],
    queryFn: () => searchPoli(keyword),
    enabled: keyword.length >= 2,
    staleTime: 300_000,
  })
}

export function useBpjsSearchDiagnosa(keyword: string) {
  return useQuery({
    queryKey: ['bpjs-diagnosa', keyword],
    queryFn: () => searchDiagnosa(keyword),
    enabled: keyword.length >= 3,
    staleTime: 300_000,
  })
}

// --- Referensi Lanjutan ---

export function useBpjsSearchProsedur(keyword: string) {
  return useQuery({
    queryKey: ['bpjs-prosedur', keyword],
    queryFn: () => searchProsedur(keyword),
    enabled: keyword.length >= 2,
    staleTime: 300_000,
  })
}

export function useBpjsSearchFaskes(keyword: string, jenis = 2) {
  return useQuery({
    queryKey: ['bpjs-faskes', keyword, jenis],
    queryFn: () => searchFaskes(keyword, jenis),
    enabled: keyword.length >= 2,
    staleTime: 300_000,
  })
}

export function useBpjsSearchDokter(keyword: string) {
  return useQuery({
    queryKey: ['bpjs-dokter', keyword],
    queryFn: () => searchDokterBpjs(keyword),
    enabled: keyword.length >= 2,
    staleTime: 300_000,
  })
}

export function useBpjsSpesialistik() {
  return useQuery({
    queryKey: ['bpjs-spesialistik'],
    queryFn: getSpesialistik,
    staleTime: 3600_000,
  })
}

// --- Monitoring ---

export function useKunjunganBulanan(tahun: string, bulan: string) {
  return useQuery({
    queryKey: ['bpjs-kunjungan-bulanan', tahun, bulan],
    queryFn: () => getKunjunganBulanan(tahun, bulan),
    enabled: !!tahun && !!bulan,
    staleTime: 300_000,
  })
}

// --- PCare ---

export function usePcareKunjungan(tglDaftar: string, offset = 0, limit = 20) {
  return useQuery({
    queryKey: ['pcare-kunjungan', tglDaftar, offset, limit],
    queryFn: () => pcareGetKunjungan(tglDaftar, offset, limit),
    enabled: !!tglDaftar,
    staleTime: 30_000,
  })
}

export function usePcareRiwayatKunjungan(noKartu: string | undefined) {
  return useQuery({
    queryKey: ['pcare-riwayat', noKartu],
    queryFn: () => pcareGetRiwayatKunjungan(noKartu!),
    enabled: !!noKartu && noKartu.length >= 10,
    staleTime: 60_000,
  })
}

export function usePcareSearchObat(keyword: string) {
  return useQuery({
    queryKey: ['pcare-obat', keyword],
    queryFn: () => pcareSearchObat(keyword),
    enabled: keyword.length >= 2,
    staleTime: 300_000,
  })
}

export function usePcareCreatePendaftaran() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pcareCreatePendaftaran(data),
    onSuccess: () => toast.success('Pendaftaran PCare berhasil'),
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  })
}

export function usePcareCreateKunjungan() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pcareCreateKunjungan(data),
    onSuccess: () => toast.success('Kunjungan PCare berhasil dicatat'),
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  })
}

// --- e-Klaim / INACBG ---

export function useEklaimGrouping() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => eklaimGrouping(data),
    onSuccess: () => toast.success('Grouping INA-CBG berhasil'),
    onError: (err: Error) => toast.error(`Gagal grouping: ${err.message}`),
  })
}

export function useEklaimClaim(noSep: string | undefined) {
  return useQuery({
    queryKey: ['eklaim-claim', noSep],
    queryFn: () => eklaimGetClaim(noSep!),
    enabled: !!noSep && noSep.length >= 10,
    staleTime: 30_000,
  })
}

export function useEklaimClaims(params?: {
  tglMasuk: string; tglPulang: string; jenisPelayanan?: string; status?: string
}) {
  return useQuery({
    queryKey: ['eklaim-claims', params],
    queryFn: () => eklaimListClaims(params!),
    enabled: !!params?.tglMasuk && !!params?.tglPulang,
    staleTime: 30_000,
  })
}

export function useEklaimClaimStatus(noSep: string | undefined) {
  return useQuery({
    queryKey: ['eklaim-status', noSep],
    queryFn: () => eklaimGetClaimStatus(noSep!),
    enabled: !!noSep && noSep.length >= 10,
  })
}

export function useEklaimDeleteClaim() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (noSep: string) => eklaimDeleteClaim(noSep),
    onSuccess: () => {
      toast.success('Klaim e-Klaim dihapus')
      qc.invalidateQueries({ queryKey: ['eklaim-claims'] })
    },
    onError: (err: Error) => toast.error(`Gagal: ${err.message}`),
  })
}

// --- Aplicare ---

export function useAplicareBed(ppkCode: string | undefined) {
  return useQuery({
    queryKey: ['aplicare-bed', ppkCode],
    queryFn: () => aplicareGetBedAvailability(ppkCode!),
    enabled: !!ppkCode,
    staleTime: 60_000,
    refetchInterval: 300_000,
  })
}

// --- Antrol (Antrean Online BPJS) ---

export function useAntrolRefPoli() {
  return useQuery({
    queryKey: ['antrol-ref-poli'],
    queryFn: antrolRefPoli,
    staleTime: 600_000,
  })
}

export function useAntrolRefDokter() {
  return useQuery({
    queryKey: ['antrol-ref-dokter'],
    queryFn: antrolRefDokter,
    staleTime: 600_000,
  })
}

export function useAntrolJadwalDokter(kodePoli: string, tanggal: string) {
  return useQuery({
    queryKey: ['antrol-jadwal', kodePoli, tanggal],
    queryFn: () => antrolGetJadwalDokter(kodePoli, tanggal),
    enabled: !!kodePoli && !!tanggal,
    staleTime: 60_000,
  })
}

export function useAntrolTambahAntrean() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: antrolTambahAntrean,
    onSuccess: () => {
      toast.success('Antrean berhasil ditambahkan')
      qc.invalidateQueries({ queryKey: ['antrol-tasks'] })
      qc.invalidateQueries({ queryKey: ['antrol-dashboard'] })
    },
    onError: (err: Error) => toast.error(`Gagal menambah antrean: ${err.message}`),
  })
}

export function useAntrolUpdateAntrean() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: antrolUpdateAntrean,
    onSuccess: () => {
      toast.success('Status antrean diupdate')
      qc.invalidateQueries({ queryKey: ['antrol-tasks'] })
      qc.invalidateQueries({ queryKey: ['antrol-dashboard'] })
    },
    onError: (err: Error) => toast.error(`Gagal update: ${err.message}`),
  })
}

export function useAntrolBatalAntrean() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: antrolBatalAntrean,
    onSuccess: () => {
      toast.success('Antrean dibatalkan')
      qc.invalidateQueries({ queryKey: ['antrol-tasks'] })
      qc.invalidateQueries({ queryKey: ['antrol-dashboard'] })
    },
    onError: (err: Error) => toast.error(`Gagal membatalkan: ${err.message}`),
  })
}

export function useAntrolListTask(kodePoli: string, tanggal: string) {
  return useQuery({
    queryKey: ['antrol-tasks', kodePoli, tanggal],
    queryFn: () => antrolGetListTask(kodePoli, tanggal),
    enabled: !!kodePoli && !!tanggal,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useAntrolSyncTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ kodePoli, tanggal }: { kodePoli: string; tanggal: string }) =>
      antrolSyncTasks(kodePoli, tanggal),
    onSuccess: (res) => {
      toast.success(res.message || 'Sinkronisasi berhasil')
      qc.invalidateQueries({ queryKey: ['antrol-tasks'] })
    },
    onError: (err: Error) => toast.error(`Gagal sync: ${err.message}`),
  })
}

export function useAntrolDashboard(params: {
  mode?: 'tanggal' | 'bulan'
  tanggal?: string
  bulan?: string
  tahun?: string
  waktu?: string
}) {
  return useQuery({
    queryKey: ['antrol-dashboard', params],
    queryFn: () => antrolGetDashboard(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}
