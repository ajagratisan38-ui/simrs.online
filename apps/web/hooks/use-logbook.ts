import { useQuery } from '@tanstack/react-query'
import { getLogbook, getLogbookStats } from '@/lib/api/logbook'
import type { LogbookFilters } from '@/lib/api/logbook'

export function useLogbook(filters: LogbookFilters) {
  return useQuery({
    queryKey: ['logbook', filters],
    queryFn: () => getLogbook(filters),
    placeholderData: (prev) => prev,
  })
}

export function useLogbookStats(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['logbook-stats', startDate, endDate],
    queryFn: () => getLogbookStats(startDate, endDate),
  })
}
