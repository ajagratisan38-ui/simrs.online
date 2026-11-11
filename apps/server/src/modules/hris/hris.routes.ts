import { Router } from 'express'
import { HrisController } from './hris.controller'
import { HrisService } from './hris.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new HrisService(db)
const controller = new HrisController(service)

const router = Router()
router.use(authenticate)

const canRead = checkAnyPermission('dashboard:read', 'report:read', 'statistics:read', 'settings:manage')
const canManage = checkAnyPermission('settings:manage', 'user:create')

// ─── DASHBOARD ───────────────────────────────────────────
router.get('/dashboard', canRead, controller.getDashboard)

// ─── EMPLOYEES ───────────────────────────────────────────
router.get('/employees', canRead, controller.listEmployees)
router.get('/employees/stats', canRead, controller.getEmployeeStats)
router.get('/employees/:id', canRead, controller.getEmployee)
router.post('/employees', canManage, controller.createEmployee)
router.put('/employees/:id', canManage, controller.updateEmployee)
router.delete('/employees/:id', canManage, controller.deleteEmployee)

// ─── USER ↔ EMPLOYEE LINKING ────────────────────────────
router.get('/users/unlinked', canManage, controller.getUnlinkedUsers)
router.post('/employees/:id/create-account', canManage, controller.createUserForEmployee)
router.put('/employees/:id/link-user', canManage, controller.linkUserToEmployee)
router.delete('/employees/:id/unlink-user', canManage, controller.unlinkUserFromEmployee)

// ─── DEPARTMENTS ─────────────────────────────────────────
router.get('/departments', canRead, controller.listDepartments)
router.post('/departments', canManage, controller.createDepartment)
router.put('/departments/:id', canManage, controller.updateDepartment)
router.delete('/departments/:id', canManage, controller.deleteDepartment)

// ─── SHIFT TEMPLATES ─────────────────────────────────────
router.get('/shifts', canRead, controller.listShiftTemplates)
router.post('/shifts', canManage, controller.createShiftTemplate)
router.put('/shifts/:id', canManage, controller.updateShiftTemplate)
router.delete('/shifts/:id', canManage, controller.deleteShiftTemplate)

// ─── SHIFT SCHEDULING ────────────────────────────────────
router.get('/schedule', canRead, controller.getShiftSchedule)
router.post('/schedule', canManage, controller.assignShift)
router.post('/schedule/bulk', canManage, controller.bulkAssignShifts)
router.delete('/schedule/:id', canManage, controller.removeShiftAssignment)

// ─── ATTENDANCE ──────────────────────────────────────────
router.get('/attendance', canRead, controller.listAttendance)
router.get('/attendance/summary', canRead, controller.getAttendanceSummary)
router.post('/attendance', canManage, controller.recordAttendance)
router.post('/attendance/bulk', canManage, controller.bulkRecordAttendance)
router.put('/attendance/:id', canManage, controller.updateAttendance)

// ─── LEAVE REQUESTS ─────────────────────────────────────
router.get('/leave', canRead, controller.listLeaveRequests)
router.get('/leave/balance/:employeeId', canRead, controller.getLeaveBalance)
router.post('/leave', canManage, controller.createLeaveRequest)
router.put('/leave/:id/approve', canManage, controller.approveLeave)
router.put('/leave/:id/reject', canManage, controller.rejectLeave)
router.put('/leave/:id/cancel', canManage, controller.cancelLeave)

// ─── PAYROLL ─────────────────────────────────────────────
router.get('/payroll', canRead, controller.listPayrollPeriods)
router.get('/payroll/:id', canRead, controller.getPayrollPeriod)
router.post('/payroll', canManage, controller.createPayrollPeriod)
router.put('/payroll/:id/process', canManage, controller.processPayroll)
router.put('/payroll/:id/finalize', canManage, controller.finalizePayroll)
router.put('/payroll/items/:itemId', canManage, controller.updatePayrollItem)
router.get('/payroll/:id/summary', canRead, controller.getPayrollSummary)
router.get('/payroll/slip/:itemId', canRead, controller.getSlipGaji)

export { router as hrisRouter }
