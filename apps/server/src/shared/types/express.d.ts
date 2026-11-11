declare namespace Express {
  interface Request {
    userId?: string
    tenantId?: string
    tenantSchema?: string
    role?: string
    saRole?: string
    userEmail?: string
    doctorId?: string
    user?: {
      id: string
      name: string
      email: string
      role: string
      doctorId?: string
      tenantId: string
    }
    // Portal (patient-facing)
    portalPatientId?: string
    portalTenantSchema?: string
  }
}
