import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError, ValidationError } from '../../shared/errors'

// ── Types ──

export interface CdssAlert {
  id?: string
  alert_type: 'high_alert' | 'interaction' | 'lasa' | 'max_dose' | 'duplicate' | 'allergy'
  severity: 'critical' | 'warning' | 'info'
  title: string
  message: string
  drug_ids: string[]
  drug_names: string[]
  interaction_id?: string
}

export interface DrugInteraction {
  id: string
  drug_a_name: string
  drug_b_name: string
  severity: string
  effect: string
  mechanism: string | null
  recommendation: string
  evidence_level: string
  source: string
  is_active: boolean
  created_at: string
}

interface DrugRow {
  id: string
  nama: string
  nama_generik: string | null
  is_high_alert: boolean
  is_lasa: boolean
  is_norum: boolean
  high_alert_category: string | null
  special_instructions: string | null
  max_dose_per_day: number | null
  max_dose_unit: string | null
  lasa_pairs: string | null
}

export interface CreateInteractionInput {
  drug_a_name: string
  drug_b_name: string
  severity: string
  effect: string
  mechanism?: string
  recommendation: string
  evidence_level?: string
  source?: string
}

export interface UpdateInteractionInput {
  drug_a_name?: string
  drug_b_name?: string
  severity?: string
  effect?: string
  mechanism?: string
  recommendation?: string
  evidence_level?: string
  source?: string
  is_active?: boolean
}

export class CdssService {
  constructor(private db: Knex) {}

  // ═══════════════════════════════════════
  // DRUG CHECKS
  // ═══════════════════════════════════════

  async checkPrescription(
    input: {
      drugIds: string[]
      patientId?: string
      visitId?: string
      prescriptionId?: string
    },
    tenantSchema: string,
  ): Promise<CdssAlert[]> {
    const { drugIds } = input
    if (!drugIds.length) return []

    const drugs = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'nama_generik', 'is_high_alert', 'is_lasa', 'is_norum',
        'high_alert_category', 'special_instructions', 'max_dose_per_day',
        'max_dose_unit', 'lasa_pairs')
      .from('drugs')
      .whereIn('id', drugIds)

    const alerts: CdssAlert[] = []

    // 1. High-alert warnings
    for (const drug of drugs) {
      if (drug.is_high_alert) {
        const categoryLabel = drug.high_alert_category
          ? ` (${this.formatCategory(drug.high_alert_category)})`
          : ''
        alerts.push({
          alert_type: 'high_alert',
          severity: 'critical',
          title: `⚠️ HIGH ALERT: ${drug.nama}`,
          message: `${drug.nama} termasuk obat high-alert${categoryLabel}. Perlu verifikasi ganda (double check) sebelum dispensing.${drug.special_instructions ? ` Instruksi khusus: ${drug.special_instructions}` : ''}`,
          drug_ids: [drug.id],
          drug_names: [drug.nama],
        })
      }
    }

    // 2. Drug-drug interactions (all pairs)
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const interactions = await this.findInteraction(drugs[i], drugs[j])
        for (const interaction of interactions) {
          const severityMap: Record<string, 'critical' | 'warning' | 'info'> = {
            major: 'critical',
            moderate: 'warning',
            minor: 'info',
          }
          alerts.push({
            alert_type: 'interaction',
            severity: severityMap[interaction.severity] || 'warning',
            title: `Interaksi Obat: ${drugs[i].nama} ↔ ${drugs[j].nama}`,
            message: `${interaction.effect}. Rekomendasi: ${interaction.recommendation}`,
            drug_ids: [drugs[i].id, drugs[j].id],
            drug_names: [drugs[i].nama, drugs[j].nama],
            interaction_id: interaction.id,
          })
        }
      }
    }

    // 3. LASA/NORUM warnings
    const lasaDrugs = drugs.filter((d) => d.is_lasa || d.is_norum)
    for (const drug of lasaDrugs) {
      const label = drug.is_lasa && drug.is_norum ? 'LASA & NORUM' : drug.is_lasa ? 'LASA' : 'NORUM'
      let pairs = ''
      if (drug.lasa_pairs) {
        try {
          const parsed = JSON.parse(drug.lasa_pairs)
          if (Array.isArray(parsed) && parsed.length) {
            pairs = ` Mirip dengan: ${parsed.join(', ')}.`
          }
        } catch {
          // skip
        }
      }
      alerts.push({
        alert_type: 'lasa',
        severity: 'warning',
        title: `${label}: ${drug.nama}`,
        message: `${drug.nama} termasuk obat ${label} (Look-Alike Sound-Alike / Nama Obat Rupa Ucapan Mirip). Perhatikan kemiripan nama saat dispensing.${pairs}`,
        drug_ids: [drug.id],
        drug_names: [drug.nama],
      })
    }

    // 4. Duplicate drug check (same generic name)
    const genericMap = new Map<string, DrugRow[]>()
    for (const drug of drugs) {
      const generic = (drug.nama_generik || drug.nama).toLowerCase().trim()
      const existing = genericMap.get(generic) || []
      existing.push(drug)
      genericMap.set(generic, existing)
    }
    for (const [genericName, duplicates] of genericMap) {
      if (duplicates.length > 1) {
        alerts.push({
          alert_type: 'duplicate',
          severity: 'warning',
          title: `Duplikasi Obat: ${genericName}`,
          message: `Ditemukan ${duplicates.length} obat dengan nama generik yang sama (${genericName}): ${duplicates.map((d) => d.nama).join(', ')}. Pastikan tidak ada duplikasi peresepan.`,
          drug_ids: duplicates.map((d) => d.id),
          drug_names: duplicates.map((d) => d.nama),
        })
      }
    }

    return alerts
  }

  async checkDrug(drugId: string, tenantSchema: string): Promise<CdssAlert[]> {
    return this.checkPrescription({ drugIds: [drugId] }, tenantSchema)
  }

  async checkInteraction(
    drugAId: string,
    drugBId: string,
    tenantSchema: string,
  ): Promise<DrugInteraction | null> {
    const [drugA, drugB] = await Promise.all([
      this.db.withSchema(tenantSchema).select('id', 'nama', 'nama_generik').from('drugs').where({ id: drugAId }).first(),
      this.db.withSchema(tenantSchema).select('id', 'nama', 'nama_generik').from('drugs').where({ id: drugBId }).first(),
    ])

    if (!drugA) throw new NotFoundError('Obat A')
    if (!drugB) throw new NotFoundError('Obat B')

    const interactions = await this.findInteraction(drugA, drugB)
    return interactions[0] || null
  }

  async checkInteractionsForDrug(
    drugId: string,
    otherDrugIds: string[],
    tenantSchema: string,
  ): Promise<DrugInteraction[]> {
    if (!otherDrugIds.length) return []

    const drug = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'nama_generik')
      .from('drugs')
      .where({ id: drugId })
      .first()

    if (!drug) throw new NotFoundError('Obat')

    const otherDrugs = await this.db
      .withSchema(tenantSchema)
      .select('id', 'nama', 'nama_generik')
      .from('drugs')
      .whereIn('id', otherDrugIds)

    const results: DrugInteraction[] = []
    for (const other of otherDrugs) {
      const interactions = await this.findInteraction(drug, other)
      results.push(...interactions)
    }

    return results
  }

  // ═══════════════════════════════════════
  // HIGH ALERT MANAGEMENT
  // ═══════════════════════════════════════

  async getHighAlertDrugs(tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('drugs')
      .where('is_high_alert', true)
      .whereNull('deleted_at')
      .orderBy('nama', 'asc')
  }

  async setHighAlert(
    drugId: string,
    data: {
      is_high_alert: boolean
      high_alert_category?: string | null
      special_instructions?: string | null
    },
    tenantSchema: string,
  ) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where({ id: drugId })
      .first()

    if (!existing) throw new NotFoundError('Obat')

    const updateData: Record<string, unknown> = {
      is_high_alert: data.is_high_alert,
      updated_at: new Date(),
    }
    if (data.high_alert_category !== undefined) {
      updateData.high_alert_category = data.high_alert_category
    }
    if (data.special_instructions !== undefined) {
      updateData.special_instructions = data.special_instructions
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('drugs')
      .where({ id: drugId })
      .update(updateData)
      .returning('*')

    logger.info('High-alert flag updated', { drugId, isHighAlert: data.is_high_alert })
    return updated
  }

  // ═══════════════════════════════════════
  // LASA / NORUM
  // ═══════════════════════════════════════

  async getLasaDrugs(tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('drugs')
      .where(function () {
        this.where('is_lasa', true).orWhere('is_norum', true)
      })
      .whereNull('deleted_at')
      .orderBy('nama', 'asc')
  }

  async setLasa(
    drugId: string,
    data: {
      is_lasa: boolean
      is_norum?: boolean
      lasa_pairs?: string[]
    },
    tenantSchema: string,
  ) {
    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where({ id: drugId })
      .first()

    if (!existing) throw new NotFoundError('Obat')

    const updateData: Record<string, unknown> = {
      is_lasa: data.is_lasa,
      updated_at: new Date(),
    }
    if (data.is_norum !== undefined) {
      updateData.is_norum = data.is_norum
    }
    if (data.lasa_pairs !== undefined) {
      updateData.lasa_pairs = JSON.stringify(data.lasa_pairs)
    }

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('drugs')
      .where({ id: drugId })
      .update(updateData)
      .returning('*')

    logger.info('LASA/NORUM flag updated', { drugId, isLasa: data.is_lasa })
    return updated
  }

  async detectLasaPairs(tenantSchema: string) {
    // Use pg_trgm similarity() to find drug name pairs that look/sound alike
    // Threshold 0.3 catches most clinically relevant pairs
    const results = await this.db.raw(`
      SELECT
        a.id AS drug_a_id,
        a.nama AS drug_a_nama,
        a.nama_generik AS drug_a_generik,
        b.id AS drug_b_id,
        b.nama AS drug_b_nama,
        b.nama_generik AS drug_b_generik,
        similarity(
          COALESCE(LOWER(a.nama_generik), LOWER(a.nama)),
          COALESCE(LOWER(b.nama_generik), LOWER(b.nama))
        ) AS sim_score
      FROM "${tenantSchema}".drugs a
      JOIN "${tenantSchema}".drugs b ON a.id < b.id
      WHERE a.deleted_at IS NULL
        AND b.deleted_at IS NULL
        AND a.is_active = true
        AND b.is_active = true
        AND similarity(
          COALESCE(LOWER(a.nama_generik), LOWER(a.nama)),
          COALESCE(LOWER(b.nama_generik), LOWER(b.nama))
        ) > 0.3
        AND a.id != b.id
      ORDER BY sim_score DESC
      LIMIT 100
    `)

    return results.rows.map((r: Record<string, unknown>) => ({
      drug_a: {
        id: r.drug_a_id,
        nama: r.drug_a_nama,
        nama_generik: r.drug_a_generik,
      },
      drug_b: {
        id: r.drug_b_id,
        nama: r.drug_b_nama,
        nama_generik: r.drug_b_generik,
      },
      similarity: Number(Number(r.sim_score).toFixed(3)),
    }))
  }

  // ═══════════════════════════════════════
  // INTERACTION DATABASE
  // ═══════════════════════════════════════

  async searchInteractions(keyword?: string, severity?: string) {
    const query = this.db
      .select('*')
      .from('public.drug_interactions')
      .where('is_active', true)

    if (keyword) {
      const pattern = `%${keyword.toLowerCase()}%`
      query.andWhere(function () {
        this.whereRaw('LOWER(drug_a_name) LIKE ?', [pattern])
          .orWhereRaw('LOWER(drug_b_name) LIKE ?', [pattern])
          .orWhereRaw('LOWER(effect) LIKE ?', [pattern])
      })
    }
    if (severity) {
      query.andWhere('severity', severity)
    }

    return query.orderBy('severity', 'asc').orderBy('drug_a_name', 'asc').limit(200)
  }

  async addInteraction(data: CreateInteractionInput) {
    const [interaction] = await this.db
      .insert({
        drug_a_name: data.drug_a_name.toLowerCase().trim(),
        drug_b_name: data.drug_b_name.toLowerCase().trim(),
        severity: data.severity,
        effect: data.effect,
        mechanism: data.mechanism || null,
        recommendation: data.recommendation,
        evidence_level: data.evidence_level || 'established',
        source: data.source || 'Manual Entry',
      })
      .into('public.drug_interactions')
      .returning('*')

    logger.info('Drug interaction added', {
      id: interaction.id,
      drugA: data.drug_a_name,
      drugB: data.drug_b_name,
    })
    return interaction
  }

  async updateInteraction(id: string, data: UpdateInteractionInput) {
    const existing = await this.db
      .select('id')
      .from('public.drug_interactions')
      .where({ id })
      .first()

    if (!existing) throw new NotFoundError('Interaksi obat')

    const updateData: Record<string, unknown> = {}
    if (data.drug_a_name !== undefined) updateData.drug_a_name = data.drug_a_name.toLowerCase().trim()
    if (data.drug_b_name !== undefined) updateData.drug_b_name = data.drug_b_name.toLowerCase().trim()
    if (data.severity !== undefined) updateData.severity = data.severity
    if (data.effect !== undefined) updateData.effect = data.effect
    if (data.mechanism !== undefined) updateData.mechanism = data.mechanism
    if (data.recommendation !== undefined) updateData.recommendation = data.recommendation
    if (data.evidence_level !== undefined) updateData.evidence_level = data.evidence_level
    if (data.source !== undefined) updateData.source = data.source
    if (data.is_active !== undefined) updateData.is_active = data.is_active

    const [updated] = await this.db
      .from('public.drug_interactions')
      .where({ id })
      .update(updateData)
      .returning('*')

    return updated
  }

  async deleteInteraction(id: string) {
    const existing = await this.db
      .select('id')
      .from('public.drug_interactions')
      .where({ id })
      .first()

    if (!existing) throw new NotFoundError('Interaksi obat')

    await this.db.from('public.drug_interactions').where({ id }).del()
    return { message: 'Interaksi obat berhasil dihapus' }
  }

  async getInteractionStats() {
    const stats = await this.db
      .select('severity')
      .count('* as count')
      .from('public.drug_interactions')
      .where('is_active', true)
      .groupBy('severity')

    const total = await this.db
      .count('* as count')
      .from('public.drug_interactions')
      .where('is_active', true)
      .first()

    return {
      total: Number(total?.count || 0),
      by_severity: stats.reduce((acc: Record<string, number>, s: { severity: string; count: string }) => {
        acc[s.severity] = Number(s.count)
        return acc
      }, {} as Record<string, number>),
    }
  }

  // ═══════════════════════════════════════
  // ALERT LOGGING
  // ═══════════════════════════════════════

  async logAlert(
    alert: CdssAlert & {
      visit_id?: string
      patient_id?: string
      prescription_id?: string
    },
    tenantSchema: string,
  ) {
    const [record] = await this.db
      .withSchema(tenantSchema)
      .insert({
        visit_id: alert.visit_id || null,
        patient_id: alert.patient_id || null,
        prescription_id: alert.prescription_id || null,
        alert_type: alert.alert_type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        drug_ids: alert.drug_ids,
        drug_names: alert.drug_names,
        interaction_id: alert.interaction_id || null,
      })
      .into('cdss_alerts')
      .returning('*')

    return record
  }

  async overrideAlert(
    alertId: string,
    userId: string,
    reason: string,
    tenantSchema: string,
  ) {
    if (!reason || reason.trim().length < 5) {
      throw new ValidationError('Alasan override harus minimal 5 karakter')
    }

    const existing = await this.db
      .withSchema(tenantSchema)
      .select('id', 'is_overridden')
      .from('cdss_alerts')
      .where({ id: alertId })
      .first()

    if (!existing) throw new NotFoundError('CDSS Alert')

    const [updated] = await this.db
      .withSchema(tenantSchema)
      .from('cdss_alerts')
      .where({ id: alertId })
      .update({
        is_overridden: true,
        overridden_by: userId,
        override_reason: reason.trim(),
        overridden_at: new Date(),
      })
      .returning('*')

    logger.info('CDSS alert overridden', { alertId, userId, reason: reason.trim() })
    return updated
  }

  async getAlertsByVisit(visitId: string, tenantSchema: string) {
    return this.db
      .withSchema(tenantSchema)
      .select('*')
      .from('cdss_alerts')
      .where({ visit_id: visitId })
      .orderBy('created_at', 'desc')
  }

  async getAlertStats(
    tenantSchema: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const baseQuery = this.db
      .withSchema(tenantSchema)
      .from('cdss_alerts')

    if (dateFrom) baseQuery.where('created_at', '>=', dateFrom)
    if (dateTo) baseQuery.where('created_at', '<=', dateTo)

    const [totalResult, overriddenResult] = await Promise.all([
      baseQuery.clone().count('* as count').first(),
      baseQuery.clone().where('is_overridden', true).count('* as count').first(),
    ])

    const byType = await baseQuery
      .clone()
      .select('alert_type')
      .count('* as count')
      .groupBy('alert_type')

    const bySeverity = await baseQuery
      .clone()
      .select('severity')
      .count('* as count')
      .groupBy('severity')

    const recent = await baseQuery
      .clone()
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(50)

    const total = Number(totalResult?.count || 0)
    const overridden = Number(overriddenResult?.count || 0)

    return {
      total,
      overridden,
      override_rate: total > 0 ? Math.round((overridden / total) * 100) : 0,
      by_type: byType.reduce((acc: Record<string, number>, r: { alert_type: string; count: string }) => {
        acc[r.alert_type] = Number(r.count)
        return acc
      }, {} as Record<string, number>),
      by_severity: bySeverity.reduce((acc: Record<string, number>, r: { severity: string; count: string }) => {
        acc[r.severity] = Number(r.count)
        return acc
      }, {} as Record<string, number>),
      recent,
    }
  }

  // ═══════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════

  private async findInteraction(
    drugA: { nama: string; nama_generik: string | null },
    drugB: { nama: string; nama_generik: string | null },
  ): Promise<DrugInteraction[]> {
    // Extract the primary word from drug name for matching
    const nameA = (drugA.nama_generik || drugA.nama).toLowerCase().trim()
    const nameB = (drugB.nama_generik || drugB.nama).toLowerCase().trim()

    // Extract first word (generic name core) for better matching
    const wordsA = this.extractDrugWords(nameA)
    const wordsB = this.extractDrugWords(nameB)

    // Build OR conditions for bidirectional matching using ILIKE
    const conditions: string[] = []
    const params: string[] = []

    for (const wordA of wordsA) {
      for (const wordB of wordsB) {
        // A→B direction
        conditions.push('(LOWER(drug_a_name) LIKE ? AND LOWER(drug_b_name) LIKE ?)')
        params.push(`%${wordA}%`, `%${wordB}%`)
        // B→A direction
        conditions.push('(LOWER(drug_a_name) LIKE ? AND LOWER(drug_b_name) LIKE ?)')
        params.push(`%${wordB}%`, `%${wordA}%`)
      }
    }

    if (!conditions.length) return []

    const result = await this.db.raw(
      `SELECT * FROM public.drug_interactions
       WHERE is_active = true AND (${conditions.join(' OR ')})
       LIMIT 5`,
      params,
    )

    return result.rows as DrugInteraction[]
  }

  private extractDrugWords(name: string): string[] {
    // Remove dose info (numbers + units), keep meaningful drug name words
    const cleaned = name
      .replace(/\d+\s*(mg|mcg|ml|g|iu|unit|tab|cap|tablet|capsule|kapsul|sirup|injeksi)\b/gi, '')
      .replace(/[()]/g, '')
      .trim()

    const words = cleaned.split(/\s+/).filter((w) => w.length >= 3)

    // Return at most 2 meaningful words (the generic name core)
    return words.length > 0 ? words.slice(0, 2) : [name.split(/\s+/)[0]]
  }

  private formatCategory(cat: string): string {
    const labels: Record<string, string> = {
      elektrolit_konsentrat: 'Elektrolit Konsentrat',
      antikoagulan: 'Antikoagulan',
      insulin: 'Insulin',
      opioid: 'Opioid',
      kemoterapi: 'Kemoterapi',
      muscle_relaxant: 'Pelemas Otot',
      agonis_adrenergik: 'Agonis Adrenergik',
      sedasi: 'Sedasi',
    }
    return labels[cat] || cat
  }
}
