import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as hrisApi from '@/lib/api/hris'

// ─── Dashboard ───────────────────────────────────────────

export function useHrisDashboard() {
  return useQuery({
    queryKey: ['hris', 'dashboard'],
    queryFn: hrisApi.getHrisDashboard,
    staleTime: 60_000,
  })
}

// ─── Employees ───────────────────────────────────────────

export function useEmployees(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: ['hris', 'employees', params],
    queryFn: () => hrisApi.listEmployees(params),
    placeholderData: (prev) => prev,
  })
}

export function useEmployee(id: string | undefined) {
  return useQuery({
    queryKey: ['hris', 'employee', id],
    queryFn: () => hrisApi.getEmployee(id!),
    enabled: !!id,
  })
}

export function useEmployeeStats() {
  return useQuery({
    queryKey: ['hris', 'employees', 'stats'],
    queryFn: hrisApi.getEmployeeStats,
    staleTime: 30_000,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.createEmployee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'employees'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrisApi.updateEmployee(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'employees'] })
      qc.invalidateQueries({ queryKey: ['hris', 'employee'] })
    },
  })
}

export function useDeleteEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.deleteEmployee,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'employees'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

// ─── Departments ─────────────────────────────────────────

export function useDepartments() {
  return useQuery({
    queryKey: ['hris', 'departments'],
    queryFn: hrisApi.listDepartments,
    staleTime: 60_000,
  })
}

export function useCreateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.createDepartment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'departments'] }),
  })
}

export function useUpdateDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrisApi.updateDepartment(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'departments'] }),
  })
}

export function useDeleteDepartment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.deleteDepartment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'departments'] }),
  })
}

// ─── Shift Templates ─────────────────────────────────────

export function useShiftTemplates() {
  return useQuery({
    queryKey: ['hris', 'shifts'],
    queryFn: hrisApi.listShiftTemplates,
    staleTime: 60_000,
  })
}

export function useCreateShiftTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.createShiftTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'shifts'] }),
  })
}

export function useUpdateShiftTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrisApi.updateShiftTemplate(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'shifts'] }),
  })
}

export function useDeleteShiftTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.deleteShiftTemplate,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'shifts'] }),
  })
}

// ─── Shift Schedule ──────────────────────────────────────

export function useShiftSchedule(params: Record<string, string>) {
  return useQuery({
    queryKey: ['hris', 'schedule', params],
    queryFn: () => hrisApi.getShiftSchedule(params),
    enabled: !!params.tanggal_mulai && !!params.tanggal_selesai,
    placeholderData: (prev) => prev,
  })
}

export function useAssignShift() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.assignShift,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'schedule'] }),
  })
}

export function useBulkAssignShifts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.bulkAssignShifts,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'schedule'] }),
  })
}

export function useRemoveShiftAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.removeShiftAssignment,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'schedule'] }),
  })
}

// ─── Attendance ──────────────────────────────────────────

export function useAttendance(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: ['hris', 'attendance', params],
    queryFn: () => hrisApi.listAttendance(params),
    placeholderData: (prev) => prev,
  })
}

export function useAttendanceSummary(bulan: number, tahun: number) {
  return useQuery({
    queryKey: ['hris', 'attendance', 'summary', bulan, tahun],
    queryFn: () => hrisApi.getAttendanceSummary(bulan, tahun),
    enabled: bulan > 0 && tahun > 0,
  })
}

export function useRecordAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.recordAttendance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'attendance'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

export function useBulkRecordAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.bulkRecordAttendance,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'attendance'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

export function useUpdateAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      hrisApi.updateAttendance(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'attendance'] }),
  })
}

// ─── Leave Requests ──────────────────────────────────────

export function useLeaveRequests(params: Record<string, string | number> = {}) {
  return useQuery({
    queryKey: ['hris', 'leave', params],
    queryFn: () => hrisApi.listLeaveRequests(params),
    placeholderData: (prev) => prev,
  })
}

export function useLeaveBalance(employeeId: string | undefined, tahun?: number) {
  return useQuery({
    queryKey: ['hris', 'leave', 'balance', employeeId, tahun],
    queryFn: () => hrisApi.getLeaveBalance(employeeId!, tahun),
    enabled: !!employeeId,
  })
}

export function useCreateLeaveRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.createLeaveRequest,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'leave'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

export function useApproveLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.approveLeave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'leave'] })
      qc.invalidateQueries({ queryKey: ['hris', 'attendance'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

export function useRejectLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      hrisApi.rejectLeave(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'leave'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

export function useCancelLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.cancelLeave,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'leave'] })
      qc.invalidateQueries({ queryKey: ['hris', 'dashboard'] })
    },
  })
}

// ─── Payroll ─────────────────────────────────────────────

export function usePayrollPeriods() {
  return useQuery({
    queryKey: ['hris', 'payroll'],
    queryFn: hrisApi.listPayrollPeriods,
  })
}

export function usePayrollPeriod(id: string | undefined) {
  return useQuery({
    queryKey: ['hris', 'payroll', id],
    queryFn: () => hrisApi.getPayrollPeriod(id!),
    enabled: !!id,
  })
}

export function useCreatePayrollPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ bulan, tahun }: { bulan: number; tahun: number }) =>
      hrisApi.createPayrollPeriod(bulan, tahun),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'payroll'] }),
  })
}

export function useProcessPayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.processPayroll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'payroll'] }),
  })
}

export function useFinalizePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: hrisApi.finalizePayroll,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'payroll'] }),
  })
}

export function useUpdatePayrollItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ itemId, data }: { itemId: string; data: Record<string, unknown> }) =>
      hrisApi.updatePayrollItem(itemId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hris', 'payroll'] }),
  })
}

export function usePayrollSummary(id: string | undefined) {
  return useQuery({
    queryKey: ['hris', 'payroll', 'summary', id],
    queryFn: () => hrisApi.getPayrollSummary(id!),
    enabled: !!id,
  })
}

export function useSlipGaji(itemId: string | undefined) {
  return useQuery({
    queryKey: ['hris', 'payroll', 'slip', itemId],
    queryFn: () => hrisApi.getSlipGaji(itemId!),
    enabled: !!itemId,
  })
}

// ─── User ↔ Employee Linking ────────────────────────────

export function useUnlinkedUsers() {
  return useQuery({
    queryKey: ['hris', 'users', 'unlinked'],
    queryFn: hrisApi.getUnlinkedUsers,
    staleTime: 15_000,
  })
}

export function useCreateUserForEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, data }: { employeeId: string; data: { password: string; role: string } }) =>
      hrisApi.createUserForEmployee(employeeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'employees'] })
      qc.invalidateQueries({ queryKey: ['hris', 'users', 'unlinked'] })
    },
  })
}

export function useLinkUserToEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ employeeId, userId }: { employeeId: string; userId: string }) =>
      hrisApi.linkUserToEmployee(employeeId, userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'employees'] })
      qc.invalidateQueries({ queryKey: ['hris', 'users', 'unlinked'] })
    },
  })
}

export function useUnlinkUserFromEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (employeeId: string) => hrisApi.unlinkUserFromEmployee(employeeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hris', 'employees'] })
      qc.invalidateQueries({ queryKey: ['hris', 'users', 'unlinked'] })
    },
  })
}
