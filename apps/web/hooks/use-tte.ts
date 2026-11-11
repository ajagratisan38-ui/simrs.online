import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  signDocument,
  verifySignature,
  getDocumentSignatures,
  getSignableDocuments,
  getSignatureById,
  getTteConfig,
  updateTteConfig,
  getTteStats,
  type SignDocumentInput,
  type UpdateTteConfigInput,
} from '@/lib/api/tte'
import { toast } from 'sonner'

export function useSignDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: SignDocumentInput) => signDocument(data),
    onSuccess: () => {
      toast.success('Dokumen berhasil ditandatangani secara digital')
      qc.invalidateQueries({ queryKey: ['tte'] })
      qc.invalidateQueries({ queryKey: ['signable-documents'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal menandatangani: ${err.message}`)
    },
  })
}

export function useVerifySignature(signatureId: string) {
  return useQuery({
    queryKey: ['tte', 'verify', signatureId],
    queryFn: () => verifySignature(signatureId),
    enabled: !!signatureId,
    staleTime: 60_000,
  })
}

export function useDocumentSignatures(documentType: string, documentId: string) {
  return useQuery({
    queryKey: ['tte', 'document', documentType, documentId],
    queryFn: () => getDocumentSignatures(documentType, documentId),
    enabled: !!documentType && !!documentId,
    staleTime: 30_000,
  })
}

export function useSignableDocuments(visitId: string) {
  return useQuery({
    queryKey: ['signable-documents', visitId],
    queryFn: () => getSignableDocuments(visitId),
    enabled: !!visitId,
    staleTime: 15_000,
  })
}

export function useSignatureById(id: string) {
  return useQuery({
    queryKey: ['tte', id],
    queryFn: () => getSignatureById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}

export function useTteConfig() {
  return useQuery({
    queryKey: ['tte-config'],
    queryFn: () => getTteConfig(),
    staleTime: 60_000,
  })
}

export function useUpdateTteConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (config: UpdateTteConfigInput) => updateTteConfig(config),
    onSuccess: () => {
      toast.success('Konfigurasi TTE berhasil diperbarui')
      qc.invalidateQueries({ queryKey: ['tte-config'] })
    },
    onError: (err: Error) => {
      toast.error(`Gagal memperbarui konfigurasi: ${err.message}`)
    },
  })
}

export function useTteStats() {
  return useQuery({
    queryKey: ['tte-stats'],
    queryFn: () => getTteStats(),
    staleTime: 30_000,
  })
}
