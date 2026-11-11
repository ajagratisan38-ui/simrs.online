import { useQuery } from '@tanstack/react-query'
import {
  getOverview,
  getVisitStats,
  getTopDiagnoses,
  getRevenueReport,
  getPharmacyReport,
  getBedOccupancy,
} from '@/lib/api/dashboard'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export function useOverview() {
  return useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: getOverview,
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useVisitStats(
  from?: string,
  to?: string,
  groupBy: 'day' | 'week' | 'month' = 'day',
) {
  const f = from || daysAgo(6)
  const t = to || todayStr()
  return useQuery({
    queryKey: ['dashboard-visits', f, t, groupBy],
    queryFn: () => getVisitStats(f, t, groupBy),
    refetchInterval: 60_000,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

export function useTopDiagnoses(
  from?: string,
  to?: string,
  limit = 10,
) {
  const f = from || daysAgo(29)
  const t = to || todayStr()
  return useQuery({
    queryKey: ['dashboard-diagnoses', f, t, limit],
    queryFn: () => getTopDiagnoses(f, t, limit),
    refetchInterval: 60_000,
    staleTime: 120_000,
    placeholderData: (prev) => prev,
  })
}

export function useRevenueReport(
  from?: string,
  to?: string,
  groupBy: 'day' | 'week' | 'month' = 'day',
) {
  const f = from || daysAgo(6)
  const t = to || todayStr()
  return useQuery({
    queryKey: ['dashboard-revenue', f, t, groupBy],
    queryFn: () => getRevenueReport(f, t, groupBy),
    refetchInterval: 60_000,
    staleTime: 120_000,
    placeholderData: (prev) => prev,
  })
}

export function usePharmacyReport() {
  return useQuery({
    queryKey: ['dashboard-pharmacy'],
    queryFn: getPharmacyReport,
    staleTime: 300_000,
    placeholderData: (prev) => prev,
  })
}

export function useBedOccupancy() {
  return useQuery({
    queryKey: ['dashboard-beds'],
    queryFn: getBedOccupancy,
    refetchInterval: 60_000,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}
