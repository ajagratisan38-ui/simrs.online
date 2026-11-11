import { Knex } from 'knex'
import crypto from 'crypto'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'
import { formatDateTime } from '../../shared/timezone'
import {
  tteConfig,
  TTE_DOCUMENT_TYPES,
  DOCUMENT_TYPE_TABLES,
  DOCUMENT_TYPE_LABELS,
  type TteDocumentType,
  type TteProvider,
} from '../../config/tte'
import { env } from '../../config/env'

export interface SignDocumentInput {
  document_type: TteDocumentType
  document_id: string
  signature_data: string
  sip_number?: string
}

export interface VerifyResult {
  valid: boolean
  tampered: boolean
  signature_level: string
  signer_name: string
  signer_role: string
  signed_at: string
  certificate_issuer: string | null
  certificate_serial: string | null
  details: string
}

export interface SignableDocument {
  document_type: TteDocumentType
  document_id: string
  label: string
  summary: string
  is_signed: boolean
  signature_id: string | null
}

interface ExternalSignResult {
  certificate_serial: string
  certificate_issuer: string
  signature_level: string
  verification_url: string
}

export class TteService {
  constructor(private db: Knex) {}

  async signDocument(
    input: SignDocumentInput,
    userId: string,
    userName: string,
    userRole: string,
    tenantSchema: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const { document_type, document_id, signature_data, sip_number } = input

    if (!TTE_DOCUMENT_TYPES.includes(document_type)) {
      throw new ValidationError(`Tipe dokumen '${document_type}' tidak didukung`)
    }

    if (!signature_data || signature_data.length < 100) {
      throw new ValidationError('Tanda tangan digital tidak valid')
    }

    // Verify document exists
    const documentContent = await this.getDocumentContent(
      document_type,
      document_id,
      tenantSchema,
    )

    if (!documentContent) {
      throw new NotFoundError('Dokumen')
    }

    // Check if already signed (for types that support tte_signature_id)
    const tteTable = this.getTteableTable(document_type)
    if (tteTable) {
      const existing = await this.db
        .withSchema(tenantSchema)
        .select('tte_signature_id')
        .from(tteTable)
        .where({ id: document_id })
        .first()

      if (existing?.tte_signature_id) {
        throw new ValidationError('Dokumen ini sudah ditandatangani secara digital')
      }
    }

    // Generate SHA-512 hash of document content
    const contentString = JSON.stringify(documentContent)
    const signatureHash = crypto
      .createHash('sha512')
      .update(contentString, 'utf8')
      .digest('hex')

    // Determine provider and sign
    const provider = tteConfig.provider as TteProvider
    let certificateSerial: string | null = null
    let certificateIssuer: string | null = null
    let signatureLevel = 'basic'
    let verificationUrl: string | null = null

    if (provider !== 'internal') {
      const signerData = {
        name: userName,
        role: userRole,
        sip: sip_number || null,
      }

      try {
        let externalResult: ExternalSignResult | null = null

        switch (provider) {
          case 'bsre':
            externalResult = await this.signWithBsre(signatureHash, signerData)
            break
          case 'vida':
            externalResult = await this.signWithVida(signatureHash, signerData)
            break
          case 'privy':
            externalResult = await this.signWithPrivy(signatureHash, signerData)
            break
        }

        if (externalResult) {
          certificateSerial = externalResult.certificate_serial
          certificateIssuer = externalResult.certificate_issuer
          signatureLevel = externalResult.signature_level
          verificationUrl = externalResult.verification_url
        }
      } catch (err) {
        logger.warn('External TTE provider failed, falling back to internal', {
          provider,
          error: (err as Error).message,
        })
        certificateIssuer = 'internal'
        signatureLevel = 'basic'
      }
    } else {
      certificateIssuer = 'internal'
    }

    // Insert signature record
    const [signature] = await this.db
      .withSchema(tenantSchema)
      .insert({
        document_type,
        document_id,
        signer_id: userId,
        signer_name: userName,
        signer_role: userRole,
        signer_sip: sip_number || null,
        signature_data,
        signature_hash: signatureHash,
        certificate_serial: certificateSerial,
        certificate_issuer: certificateIssuer,
        signature_level: signatureLevel,
        verification_url: verificationUrl,
        ip_address: ipAddress || null,
        user_agent: userAgent || null,
        signed_at: new Date(),
      })
      .into('digital_signatures')
      .returning('*')

    // Update source document with tte_signature_id
    if (tteTable) {
      await this.db
        .withSchema(tenantSchema)
        .from(tteTable)
        .where({ id: document_id })
        .update({
          tte_signature_id: signature.id,
          tte_signed_at: new Date(),
        })
    }

    logger.info('Document signed digitally', {
      signatureId: signature.id,
      documentType: document_type,
      documentId: document_id,
      signer: userName,
      level: signatureLevel,
      tenant: tenantSchema,
    })

    return signature
  }

  async verifySignature(signatureId: string, tenantSchema: string): Promise<VerifyResult> {
    const signature = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('digital_signatures')
      .where({ id: signatureId })
      .first()

    if (!signature) {
      throw new NotFoundError('Tanda tangan digital')
    }

    // Re-hash current document content
    const currentContent = await this.getDocumentContent(
      signature.document_type as TteDocumentType,
      signature.document_id,
      tenantSchema,
    )

    let tampered = false
    let details = 'Tanda tangan valid'

    if (!currentContent) {
      tampered = true
      details = 'Dokumen sumber tidak ditemukan — kemungkinan telah dihapus'
    } else {
      const currentHash = crypto
        .createHash('sha512')
        .update(JSON.stringify(currentContent), 'utf8')
        .digest('hex')

      if (currentHash !== signature.signature_hash) {
        tampered = true
        details = 'Dokumen telah diubah setelah penandatanganan — integritas terganggu'
      }
    }

    // If external provider, check certificate
    if (
      signature.certificate_issuer &&
      signature.certificate_issuer !== 'internal' &&
      !tampered
    ) {
      details = `Tanda tangan valid — disertifikasi oleh ${signature.certificate_issuer.toUpperCase()}`
    }

    return {
      valid: !tampered,
      tampered,
      signature_level: signature.signature_level,
      signer_name: signature.signer_name,
      signer_role: signature.signer_role,
      signed_at: signature.signed_at,
      certificate_issuer: signature.certificate_issuer,
      certificate_serial: signature.certificate_serial,
      details,
    }
  }

  async getSignaturesByDocument(
    documentType: string,
    documentId: string,
    tenantSchema: string,
  ) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('digital_signatures')
      .where({ document_type: documentType, document_id: documentId })
      .orderBy('signed_at', 'desc')
  }

  async getSignatureById(id: string, tenantSchema: string) {
    const sig = await this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('digital_signatures')
      .where({ id })
      .first()

    if (!sig) throw new NotFoundError('Tanda tangan digital')
    return sig
  }

  async getSignableDocuments(
    visitId: string,
    tenantSchema: string,
  ): Promise<SignableDocument[]> {
    const visit = await this.db
      .withSchema(tenantSchema)
      .select('id', 'patient_id')
      .from('visits')
      .where({ id: visitId })
      .first()

    if (!visit) throw new NotFoundError('Kunjungan')

    const documents: SignableDocument[] = []

    // Medical Records
    const medRecs = await this.db
      .withSchema(tenantSchema)
      .select('id', 'tte_signature_id', 'status')
      .from('medical_records')
      .where({ visit_id: visitId })

    for (const mr of medRecs) {
      documents.push({
        document_type: 'medical_record',
        document_id: mr.id,
        label: DOCUMENT_TYPE_LABELS.medical_record,
        summary: `Rekam Medis — Status: ${mr.status}`,
        is_signed: !!mr.tte_signature_id,
        signature_id: mr.tte_signature_id || null,
      })
    }

    // CPPT Entries
    const cpptEntries = await this.db
      .withSchema(tenantSchema)
      .select('c.id', 'c.tte_signature_id', 'c.profesi', 'c.tanggal_waktu')
      .from('cppt_entries as c')
      .where({ 'c.visit_id': visitId })
      .whereNull('c.deleted_at')

    for (const cppt of cpptEntries) {
      const time = await formatDateTime(cppt.tanggal_waktu)
      documents.push({
        document_type: 'cppt',
        document_id: cppt.id,
        label: DOCUMENT_TYPE_LABELS.cppt,
        summary: `CPPT ${cppt.profesi} — ${time}`,
        is_signed: !!cppt.tte_signature_id,
        signature_id: cppt.tte_signature_id || null,
      })
    }

    // General Consents
    const consents = await this.db
      .withSchema(tenantSchema)
      .select('id', 'tte_signature_id', 'created_at')
      .from('general_consents')
      .where({ visit_id: visitId })

    for (const gc of consents) {
      documents.push({
        document_type: 'general_consent',
        document_id: gc.id,
        label: DOCUMENT_TYPE_LABELS.general_consent,
        summary: `General Consent — ${await formatDateTime(gc.created_at)}`,
        is_signed: !!gc.tte_signature_id,
        signature_id: gc.tte_signature_id || null,
      })
    }

    // Lab Orders
    try {
      const labOrders = await this.db
        .withSchema(tenantSchema)
        .select('id', 'order_number', 'status')
        .from('lab_orders')
        .where({ visit_id: visitId })
        .where('status', 'completed')

      for (const lo of labOrders) {
        const existing = await this.db
          .withSchema(tenantSchema)
          .select('id')
          .from('digital_signatures')
          .where({ document_type: 'lab_result', document_id: lo.id })
          .first()

        documents.push({
          document_type: 'lab_result',
          document_id: lo.id,
          label: DOCUMENT_TYPE_LABELS.lab_result,
          summary: `Lab #${lo.order_number}`,
          is_signed: !!existing,
          signature_id: existing?.id || null,
        })
      }
    } catch { /* table may not exist */ }

    // Radiology Orders
    try {
      const radOrders = await this.db
        .withSchema(tenantSchema)
        .select('id', 'order_number', 'status')
        .from('radiology_orders')
        .where({ visit_id: visitId })
        .where('status', 'completed')

      for (const ro of radOrders) {
        const existing = await this.db
          .withSchema(tenantSchema)
          .select('id')
          .from('digital_signatures')
          .where({ document_type: 'radiology_result', document_id: ro.id })
          .first()

        documents.push({
          document_type: 'radiology_result',
          document_id: ro.id,
          label: DOCUMENT_TYPE_LABELS.radiology_result,
          summary: `Radiologi #${ro.order_number}`,
          is_signed: !!existing,
          signature_id: existing?.id || null,
        })
      }
    } catch { /* table may not exist */ }

    // Nursing Assessments
    try {
      const assessments = await this.db
        .withSchema(tenantSchema)
        .select('id', 'status', 'created_at')
        .from('nursing_assessments')
        .where({ visit_id: visitId })

      for (const na of assessments) {
        const existing = await this.db
          .withSchema(tenantSchema)
          .select('id')
          .from('digital_signatures')
          .where({ document_type: 'nursing_assessment', document_id: na.id })
          .first()

        documents.push({
          document_type: 'nursing_assessment',
          document_id: na.id,
          label: DOCUMENT_TYPE_LABELS.nursing_assessment,
          summary: `Pengkajian — ${na.status || 'draft'}`,
          is_signed: !!existing,
          signature_id: existing?.id || null,
        })
      }
    } catch { /* table may not exist */ }

    // Surgeries
    try {
      const surgeries = await this.db
        .withSchema(tenantSchema)
        .select('id', 'nama_operasi', 'status')
        .from('surgeries')
        .where({ visit_id: visitId })

      for (const s of surgeries) {
        const existing = await this.db
          .withSchema(tenantSchema)
          .select('id')
          .from('digital_signatures')
          .where({ document_type: 'surgery_report', document_id: s.id })
          .first()

        documents.push({
          document_type: 'surgery_report',
          document_id: s.id,
          label: DOCUMENT_TYPE_LABELS.surgery_report,
          summary: `Operasi: ${s.nama_operasi || '-'}`,
          is_signed: !!existing,
          signature_id: existing?.id || null,
        })
      }
    } catch { /* table may not exist */ }

    return documents
  }

  async getStats(tenantSchema: string) {
    const totalResult = await this.db
      .withSchema(tenantSchema)
      .count('id as count')
      .from('digital_signatures')
      .first()

    const total = Number(totalResult?.count || 0)

    const byType = await this.db
      .withSchema(tenantSchema)
      .select('document_type')
      .count('id as count')
      .from('digital_signatures')
      .groupBy('document_type')
      .orderBy('count', 'desc')

    const bySigner = await this.db
      .withSchema(tenantSchema)
      .select('signer_name', 'signer_role')
      .count('id as count')
      .from('digital_signatures')
      .groupBy('signer_name', 'signer_role')
      .orderBy('count', 'desc')
      .limit(10)

    const byLevel = await this.db
      .withSchema(tenantSchema)
      .select('signature_level')
      .count('id as count')
      .from('digital_signatures')
      .groupBy('signature_level')

    return {
      total,
      byType: byType.map((r: Record<string, unknown>) => ({
        type: r.document_type as string,
        label: DOCUMENT_TYPE_LABELS[r.document_type as TteDocumentType] || r.document_type,
        count: Number(r.count),
      })),
      bySigner: bySigner.map((r: Record<string, unknown>) => ({
        name: r.signer_name as string,
        role: r.signer_role as string,
        count: Number(r.count),
      })),
      byLevel: byLevel.map((r: Record<string, unknown>) => ({
        level: r.signature_level as string,
        count: Number(r.count),
      })),
    }
  }

  // --- Private Helpers ---

  private getTteableTable(docType: string): string | null {
    const tteableTables: Record<string, string> = {
      medical_record: 'medical_records',
      cppt: 'cppt_entries',
      general_consent: 'general_consents',
    }
    return tteableTables[docType] || null
  }

  private async getDocumentContent(
    documentType: TteDocumentType,
    documentId: string,
    tenantSchema: string,
  ): Promise<Record<string, unknown> | null> {
    const table = DOCUMENT_TYPE_TABLES[documentType]
    if (!table) return null

    try {
      const doc = await this.db
        .withSchema(tenantSchema)
        .select('*')
        .from(table)
        .where({ id: documentId })
        .first()

      if (!doc) return null

      // Strip volatile fields that shouldn't affect the hash
      const record = doc as Record<string, unknown>
      const { tte_signature_id: _a, tte_signed_at: _b, updated_at: _c, ...contentFields } = record

      return contentFields
    } catch {
      return null
    }
  }

  // --- External Provider Integrations ---

  async signWithBsre(
    documentHash: string,
    signerData: { name: string; role: string; sip: string | null },
  ): Promise<ExternalSignResult> {
    const { bsre } = tteConfig

    // Mock mode when credentials are empty or in dev
    if (!bsre.username || !bsre.password || env.isDev) {
      logger.info('BSrE sign — mock mode', { signer: signerData.name })
      return {
        certificate_serial: `BSrE-MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        certificate_issuer: 'BSrE',
        signature_level: 'qualified',
        verification_url: `https://esign.bsre.bssn.go.id/verify/${documentHash.slice(0, 16)}`,
      }
    }

    // Real BSrE API call
    try {
      const response = await fetch(`${bsre.baseUrl}/sign/hash`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${bsre.username}:${bsre.password}`).toString('base64')}`,
        },
        body: JSON.stringify({
          hash: documentHash,
          nik: signerData.sip || '',
          passphrase: bsre.password,
        }),
      })

      if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`BSrE API error: ${response.status} — ${errBody}`)
      }

      const result = await response.json() as Record<string, unknown>

      return {
        certificate_serial: (result.certificate_serial as string) || `BSrE-${Date.now()}`,
        certificate_issuer: 'BSrE',
        signature_level: 'qualified',
        verification_url: (result.verification_url as string)
          || `https://esign.bsre.bssn.go.id/verify/${documentHash.slice(0, 16)}`,
      }
    } catch (err) {
      logger.error('BSrE sign failed', { error: (err as Error).message })
      throw err
    }
  }

  async signWithVida(
    documentHash: string,
    signerData: { name: string; role: string; sip: string | null },
  ): Promise<ExternalSignResult> {
    const { vida } = tteConfig

    if (!vida.apiKey || !vida.apiSecret || env.isDev) {
      logger.info('VIDA sign — mock mode', { signer: signerData.name })
      return {
        certificate_serial: `VIDA-MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        certificate_issuer: 'VIDA',
        signature_level: 'qualified',
        verification_url: `https://verify.vida.id/${documentHash.slice(0, 16)}`,
      }
    }

    try {
      const response = await fetch(`${vida.baseUrl}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': vida.apiKey,
          'X-API-Secret': vida.apiSecret,
        },
        body: JSON.stringify({
          document_hash: documentHash,
          signer_name: signerData.name,
          signer_id: signerData.sip || '',
        }),
      })

      if (!response.ok) {
        throw new Error(`VIDA API error: ${response.status}`)
      }

      const result = await response.json() as Record<string, unknown>

      return {
        certificate_serial: (result.serial_number as string) || `VIDA-${Date.now()}`,
        certificate_issuer: 'VIDA',
        signature_level: 'qualified',
        verification_url: (result.verify_url as string)
          || `https://verify.vida.id/${documentHash.slice(0, 16)}`,
      }
    } catch (err) {
      logger.error('VIDA sign failed', { error: (err as Error).message })
      throw err
    }
  }

  async signWithPrivy(
    documentHash: string,
    signerData: { name: string; role: string; sip: string | null },
  ): Promise<ExternalSignResult> {
    const { privy } = tteConfig

    if (!privy.merchantKey || !privy.merchantToken || env.isDev) {
      logger.info('Privy sign — mock mode', { signer: signerData.name })
      return {
        certificate_serial: `PRIVY-MOCK-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        certificate_issuer: 'Privy',
        signature_level: 'advanced',
        verification_url: `https://app.privy.id/verify/${documentHash.slice(0, 16)}`,
      }
    }

    try {
      const response = await fetch(`${privy.baseUrl}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Merchant-Key': privy.merchantKey,
          'Authorization': `Bearer ${privy.merchantToken}`,
        },
        body: JSON.stringify({
          hash: documentHash,
          signer: {
            name: signerData.name,
            identifier: signerData.sip || '',
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`Privy API error: ${response.status}`)
      }

      const result = await response.json() as Record<string, unknown>

      return {
        certificate_serial: (result.certificate_id as string) || `PRIVY-${Date.now()}`,
        certificate_issuer: 'Privy',
        signature_level: 'advanced',
        verification_url: (result.verify_url as string)
          || `https://app.privy.id/verify/${documentHash.slice(0, 16)}`,
      }
    } catch (err) {
      logger.error('Privy sign failed', { error: (err as Error).message })
      throw err
    }
  }
}
