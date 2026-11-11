import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import { env } from './config/env'
import { logger } from './shared/logger'
import { errorHandler } from './middleware/error-handler'
import { testDatabaseConnection } from './config/database'
import { testRedisConnection } from './config/redis'
import { swaggerSpec } from './config/swagger'
import { sanitizeInput } from './middleware/sanitize'
import { auditMiddleware } from './middleware/audit'
import { loginRateLimiter, apiRateLimiter } from './middleware/rate-limiter'
import authRoutes from './modules/auth/auth.routes'
import patientRoutes from './modules/patient/patient.routes'
import registrationRoutes from './modules/registration/registration.routes'
import lookupRoutes from './modules/registration/lookup.routes'
import medicalRecordRoutes, {
  icd10Router,
  icd9cmRouter,
  templateRouter,
  patientMedicalRecordRouter,
} from './modules/medical-record/medical-record.routes'
import {
  drugRouter,
  dispensingRouter,
} from './modules/pharmacy/pharmacy.routes'
import billingRoutes from './modules/billing/billing.routes'
import { syncRoutes } from './modules/sync/sync.routes'
import { bpjsRoutes } from './modules/bpjs/bpjs.routes'
import { satusehatRoutes } from './modules/satusehat/satusehat.routes'
import { dashboardRoutes } from './modules/dashboard/dashboard.routes'
import { auditRoutes } from './modules/audit/audit.routes'
import { labOrderRouter, labParamRouter } from './modules/laboratory/laboratory.routes'
import { radiologyOrderRouter, radiologyExamRouter } from './modules/radiology/radiology.routes'
import { nutritionRouter } from './modules/nutrition/nutrition.routes'
import { inventoryRouter } from './modules/inventory/inventory.routes'
import { otcSalesRouter } from './modules/pharmacy/otc-sales.routes'
import { surgeryRouter } from './modules/surgery/surgery.routes'
import { importRouter } from './modules/import/import.routes'
import { migrationRouter } from './modules/migration/migration.routes'
import { tenantRouter } from './modules/tenant/tenant.routes'
import { superAdminRouter, publicRegistrationRouter } from './modules/super-admin/super-admin.routes'
import { userManagementRouter } from './modules/auth/user-management.routes'
import { igdRoutes } from './modules/igd/igd.routes'
import { inpatientRouter } from './modules/inpatient/inpatient.routes'
import { inpatientClinicalRouter } from './modules/inpatient/inpatient-clinical.routes'
import { cpptRouter } from './modules/cppt/cppt.routes'
import { supplierRouter, purchaseOrderRouter } from './modules/purchase-order/po.routes'
import { generalConsentRouter } from './modules/general-consent/general-consent.routes'
import { logbookRouter } from './modules/medical-record/logbook.routes'
import { doctorRouter } from './modules/doctor/doctor.routes'
import { warehouseRouter, stockOpnameRouter } from './modules/warehouse/warehouse.routes'
import { assetRouter } from './modules/asset/asset.routes'
import { tarifRouter } from './modules/tarif/tarif.routes'
import { rehabRouter, practitionerRouter } from './modules/rehabilitation/rehabilitation.routes'
import { insuranceRouter, patientInsuranceRouter } from './modules/insurance/insurance.routes'
import { nursingRouter } from './modules/nursing/nursing.routes'
import { backupRoutes } from './modules/backup/backup.routes'
import { tteRouter } from './modules/tte/tte.routes'
import { terminologyRouter } from './modules/terminology/terminology.routes'
import { cdssRouter } from './modules/cdss/cdss.routes'
import { accountingRouter } from './modules/accounting/accounting.routes'
import { hrisRouter } from './modules/hris/hris.routes'
import { educationRouter } from './modules/education/education.routes'
import { portalRouter } from './modules/portal/portal.routes'
import { onboardingRouter } from './modules/onboarding/onboarding.routes'
import { notificationRouter } from './modules/notification/notification.routes'
import { mcuRouter } from './modules/mcu/mcu.routes'
import { siranapRouter } from './modules/siranap/siranap.routes'
import { sirsOnlineRouter } from './modules/sirs-online/sirs.routes'

const app = express()

// --- Swagger API Documentation (before Helmet so CSP doesn't block it) ---
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'SIMRS SaaS — API Documentation',
}))
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

// --- Security Headers (Helmet) ---
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))

// --- CORS ---
app.use(cors({
  origin: env.isDev ? '*' : [],
  credentials: true,
}))

// --- Core Middleware ---
app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// --- Input Sanitization ---
app.use(sanitizeInput)

// --- Maintenance Mode Guard ---
import { maintenanceGuard } from './middleware/maintenance'
app.use(maintenanceGuard)

// --- API Rate Limiting ---
app.use('/api/', apiRateLimiter)

// --- Audit Trail (auto-log sensitive entity access) ---
app.use('/api/v1/', auditMiddleware)

// Request logging
app.use(morgan('short', {
  stream: { write: (message) => logger.info(message.trim()) },
}))

// --- Serve Uploaded Files ---
app.use('/uploads', express.static(path.resolve(__dirname, '../../../uploads')))

// --- Health Check ---
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    },
  })
})

// --- API Routes ---
app.use('/api/v1/auth/login', loginRateLimiter)
app.use('/api/v1/auth', authRoutes)
app.use('/api/v1/audit-logs', auditRoutes)
app.use('/api/v1/patients', patientRoutes)
app.use('/api/v1/visits', registrationRoutes)
app.use('/api/v1/lookup', lookupRoutes)
app.use('/api/v1/medical-records', medicalRecordRoutes)
app.use('/api/v1/icd10', icd10Router)
app.use('/api/v1/icd9cm', icd9cmRouter)
app.use('/api/v1/medical-templates', templateRouter)
app.use('/api/v1/patients/:patientId/medical-records', patientMedicalRecordRouter)
app.use('/api/v1/drugs', drugRouter)
app.use('/api/v1/dispensing', dispensingRouter)
app.use('/api/v1/bills', billingRoutes)
app.use('/api/v1/sync', syncRoutes)
app.use('/api/v1/bpjs', bpjsRoutes)
app.use('/api/v1/satusehat', satusehatRoutes)
app.use('/api/v1/dashboard', dashboardRoutes)
app.use('/api/v1/lab-orders', labOrderRouter)
app.use('/api/v1/lab-parameters', labParamRouter)
app.use('/api/v1/radiology-orders', radiologyOrderRouter)
app.use('/api/v1/radiology-examinations', radiologyExamRouter)
app.use('/api/v1/nutrition', nutritionRouter)
app.use('/api/v1/item-transfers', inventoryRouter)
app.use('/api/v1/otc-sales', otcSalesRouter)
app.use('/api/v1/surgeries', surgeryRouter)
app.use('/api/v1/import', importRouter)
app.use('/api/v1/migration', migrationRouter)
app.use('/api/v1/tenant', tenantRouter)
import { saIpWhitelist } from './middleware/ip-whitelist'
app.use('/api/v1/super-admin', saIpWhitelist, superAdminRouter)
app.use('/api/v1', publicRegistrationRouter)
app.use('/api/v1/users', userManagementRouter)
app.use('/api/v1/igd', igdRoutes)
app.use('/api/v1/inpatient', inpatientRouter)
app.use('/api/v1/inpatient-clinical', inpatientClinicalRouter)
app.use('/api/v1/cppt', cpptRouter)
app.use('/api/v1/suppliers', supplierRouter)
app.use('/api/v1/purchase-orders', purchaseOrderRouter)
app.use('/api/v1/general-consents', generalConsentRouter)
app.use('/api/v1/logbook', logbookRouter)
app.use('/api/v1/doctors', doctorRouter)
app.use('/api/v1/warehouse', warehouseRouter)
app.use('/api/v1/stock-opname', stockOpnameRouter)
app.use('/api/v1/assets', assetRouter)
app.use('/api/v1/tarif', tarifRouter)
app.use('/api/v1/rehabilitation', rehabRouter)
app.use('/api/v1/external-practitioners', practitionerRouter)
app.use('/api/v1/insurances', insuranceRouter)
app.use('/api/v1/patients', patientInsuranceRouter)
app.use('/api/v1/nursing', nursingRouter)
app.use('/api/v1/backup', backupRoutes)
app.use('/api/v1/tte', tteRouter)
app.use('/api/v1/terminology', terminologyRouter)
app.use('/api/v1/cdss', cdssRouter)
app.use('/api/v1/accounting', accountingRouter)
app.use('/api/v1/hris', hrisRouter)
app.use('/api/v1/education', educationRouter)
app.use('/api/v1/portal', portalRouter)
app.use('/api/v1/onboarding', onboardingRouter)
app.use('/api/v1/notifications', notificationRouter)
app.use('/api/v1/mcu', mcuRouter)
app.use('/api/v1/siranap', siranapRouter)
app.use('/api/v1/sirs-online', sirsOnlineRouter)

// API info
app.get('/api/v1', (_req, res) => {
  res.json({
    success: true,
    data: {
      message: 'SIMRS SaaS API v1',
      endpoints: {
        auth: '/api/v1/auth',
        patients: '/api/v1/patients',
        visits: '/api/v1/visits',
        medicalRecords: '/api/v1/medical-records',
        icd10: '/api/v1/icd10',
        icd9cm: '/api/v1/icd9cm',
        medicalTemplates: '/api/v1/medical-templates',
        drugs: '/api/v1/drugs',
        dispensing: '/api/v1/dispensing',
        bills: '/api/v1/bills',
        sync: '/api/v1/sync',
        bpjs: '/api/v1/bpjs',
        satusehat: '/api/v1/satusehat',
        dashboard: '/api/v1/dashboard',
        auditLogs: '/api/v1/audit-logs',
        labOrders: '/api/v1/lab-orders',
        labParameters: '/api/v1/lab-parameters',
        radiologyOrders: '/api/v1/radiology-orders',
        radiologyExaminations: '/api/v1/radiology-examinations',
        nutrition: '/api/v1/nutrition',
        itemTransfers: '/api/v1/item-transfers',
        otcSales: '/api/v1/otc-sales',
        surgeries: '/api/v1/surgeries',
        import: '/api/v1/import',
        migration: '/api/v1/migration',
        tenant: '/api/v1/tenant',
        users: '/api/v1/users',
        cppt: '/api/v1/cppt',
        suppliers: '/api/v1/suppliers',
        purchaseOrders: '/api/v1/purchase-orders',
        generalConsents: '/api/v1/general-consents',
        logbook: '/api/v1/logbook',
        igd: '/api/v1/igd',
        inpatient: '/api/v1/inpatient',
        doctors: '/api/v1/doctors',
        warehouse: '/api/v1/warehouse',
        stockOpname: '/api/v1/stock-opname',
        insurances: '/api/v1/insurances',
        patientInsurances: '/api/v1/patients/:patientId/insurances',
        nursing: '/api/v1/nursing',
        backup: '/api/v1/backup',
        tte: '/api/v1/tte',
        terminology: '/api/v1/terminology',
        cdss: '/api/v1/cdss',
        accounting: '/api/v1/accounting',
        hris: '/api/v1/hris',
        education: '/api/v1/education',
        portal: '/api/v1/portal',
        onboarding: '/api/v1/onboarding',
        siranap: '/api/v1/siranap',
        sirsOnline: '/api/v1/sirs-online',
        health: '/api/health',
      },
    },
  })
})

// --- 404 Handler ---
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint tidak ditemukan',
    },
  })
})

// --- Error Handler ---
app.use(errorHandler)

// --- Start Server ---
async function start() {
  logger.info('Starting SIMRS SaaS Server...')

  const dbConnected = await testDatabaseConnection()
  if (!dbConnected) {
    logger.warn('Database not available — server will start without DB')
  }

  const redisConnected = await testRedisConnection()
  if (!redisConnected) {
    logger.warn('Redis not available — server will start without Redis')
  }

  // Initialize backup scheduler (BullMQ repeatable job)
  try {
    const { initBackupScheduler } = await import('./modules/backup/backup.worker')
    await initBackupScheduler()
  } catch (err) {
    logger.warn('Backup scheduler init skipped', { error: (err as Error).message })
  }

  // Initialize subscription expiry checker (daily 08:00 WIB)
  try {
    const { initExpiryScheduler } = await import('./modules/super-admin/expiry.worker')
    await initExpiryScheduler()
  } catch (err) {
    logger.warn('Expiry scheduler init skipped', { error: (err as Error).message })
  }

  // Initialize SIRANAP scheduler (every 15min check)
  try {
    const { initSiranapScheduler } = await import('./modules/siranap/siranap.worker')
    await initSiranapScheduler()
  } catch (err) {
    logger.warn('SIRANAP scheduler init skipped', { error: (err as Error).message })
  }

  app.listen(env.port, () => {
    logger.info(`Server running on http://localhost:${env.port}`)
    logger.info(`Environment: ${env.nodeEnv}`)
    logger.info(`Health check: http://localhost:${env.port}/api/health`)
  })
}

// --- Global error safety net — prevent Redis/DB errors from crashing the process ---
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection (caught by safety net)', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  })
})

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception (caught by safety net)', {
    message: error.message,
    stack: error.stack,
  })
  // Don't exit — keep the server alive for non-fatal errors
  // Only truly fatal errors (out of memory, etc.) will still kill the process
})

start().catch((error) => {
  logger.error('Failed to start server', { error })
  process.exit(1)
})

export default app
