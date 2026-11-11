import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createGeneralConsent,
  getGeneralConsent,
  listPatientConsents,
  getVisitConsent,
} from '@/lib/api/general-consent'
import type { CreateGeneralConsentInput } from '@/lib/api/general-consent'

export function usePatientConsents(patientId: string | undefined) {
  return useQuery({
    queryKey: ['general-consents', 'patient', patientId],
    queryFn: () => listPatientConsents(patientId!),
    enabled: !!patientId,
  })
}

export function useGeneralConsent(id: string | undefined) {
  return useQuery({
    queryKey: ['general-consents', id],
    queryFn: () => getGeneralConsent(id!),
    enabled: !!id,
  })
}

export function useVisitConsent(visitId: string | undefined) {
  return useQuery({
    queryKey: ['general-consents', 'visit', visitId],
    queryFn: () => getVisitConsent(visitId!),
    enabled: !!visitId,
  })
}

export function useCreateGeneralConsent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGeneralConsentInput) => createGeneralConsent(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['general-consents'] })
    },
  })
}
