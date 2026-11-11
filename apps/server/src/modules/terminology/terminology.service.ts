import { Knex } from 'knex'
import { logger } from '../../shared/logger'
import { NotFoundError } from '../../shared/errors'

export interface LoincCode {
  id: string
  code: string
  name: string
  short_name: string | null
  kategori: string | null
  class: string | null
  property: string | null
  time_aspect: string | null
  system: string | null
  scale: string | null
  method: string | null
  unit: string | null
  ucum_code: string | null
  is_active: boolean
  created_at: string
}

export interface KfaCode {
  id: string
  code: string
  name: string
  nama_dagang: string | null
  kekuatan: string | null
  bentuk_sediaan: string | null
  kategori: string | null
  golongan: string | null
  pabrik: string | null
  nie: string | null
  is_active: boolean
  created_at: string
}

export interface CategoryStat {
  kategori: string
  count: number
}

export class TerminologyService {
  constructor(private db: Knex) {}

  // ===================================================
  // LOINC — search, get, categories, stats
  // ===================================================

  async searchLoinc(keyword: string, kategori?: string, limit = 30): Promise<LoincCode[]> {
    const pattern = `%${keyword}%`

    const query = this.db('public.loinc_codes')
      .select('*')
      .where('is_active', true)
      .andWhere(function () {
        this.whereILike('code', pattern)
          .orWhereILike('name', pattern)
          .orWhereILike('short_name', pattern)
      })

    if (kategori) {
      query.andWhere('kategori', kategori)
    }

    return query
      .orderByRaw('CASE WHEN code ILIKE ? THEN 0 ELSE 1 END', [pattern])
      .orderBy('code', 'asc')
      .limit(Math.min(limit, 100))
  }

  async getLoincByCode(code: string): Promise<LoincCode> {
    const row = await this.db('public.loinc_codes')
      .where('code', code)
      .first()

    if (!row) throw new NotFoundError(`LOINC code '${code}'`)
    return row
  }

  async getLoincCategories(): Promise<string[]> {
    const rows = await this.db('public.loinc_codes')
      .distinct('kategori')
      .where('is_active', true)
      .whereNotNull('kategori')
      .orderBy('kategori', 'asc')

    return rows.map((r: Record<string, unknown>) => r.kategori as string)
  }

  async getLoincStats(): Promise<{ total: number; perCategory: CategoryStat[] }> {
    const [{ count: total }] = await this.db('public.loinc_codes')
      .where('is_active', true)
      .count('id as count')

    const perCategory = await this.db('public.loinc_codes')
      .select('kategori')
      .count('id as count')
      .where('is_active', true)
      .whereNotNull('kategori')
      .groupBy('kategori')
      .orderBy('kategori', 'asc')

    return {
      total: Number(total),
      perCategory: perCategory.map((r: Record<string, unknown>) => ({
        kategori: r.kategori as string,
        count: Number(r.count),
      })),
    }
  }

  // ===================================================
  // KFA — search, get, categories, golongan, stats
  // ===================================================

  async searchKfa(
    keyword: string,
    kategori?: string,
    golongan?: string,
    limit = 30,
  ): Promise<KfaCode[]> {
    const pattern = `%${keyword}%`

    const query = this.db('public.kfa_codes')
      .select('*')
      .where('is_active', true)
      .andWhere(function () {
        this.whereILike('code', pattern)
          .orWhereILike('name', pattern)
          .orWhereILike('nama_dagang', pattern)
      })

    if (kategori) {
      query.andWhere('kategori', kategori)
    }
    if (golongan) {
      query.andWhere('golongan', golongan)
    }

    return query
      .orderByRaw('CASE WHEN code ILIKE ? THEN 0 ELSE 1 END', [pattern])
      .orderBy('name', 'asc')
      .limit(Math.min(limit, 100))
  }

  async getKfaByCode(code: string): Promise<KfaCode> {
    const row = await this.db('public.kfa_codes')
      .where('code', code)
      .first()

    if (!row) throw new NotFoundError(`KFA code '${code}'`)
    return row
  }

  async getKfaCategories(): Promise<string[]> {
    const rows = await this.db('public.kfa_codes')
      .distinct('kategori')
      .where('is_active', true)
      .whereNotNull('kategori')
      .orderBy('kategori', 'asc')

    return rows.map((r: Record<string, unknown>) => r.kategori as string)
  }

  async getKfaGolongan(): Promise<string[]> {
    const rows = await this.db('public.kfa_codes')
      .distinct('golongan')
      .where('is_active', true)
      .whereNotNull('golongan')
      .orderBy('golongan', 'asc')

    return rows.map((r: Record<string, unknown>) => r.golongan as string)
  }

  async getKfaStats(): Promise<{
    total: number
    perKategori: CategoryStat[]
    perGolongan: CategoryStat[]
  }> {
    const [{ count: total }] = await this.db('public.kfa_codes')
      .where('is_active', true)
      .count('id as count')

    const perKategori = await this.db('public.kfa_codes')
      .select('kategori')
      .count('id as count')
      .where('is_active', true)
      .whereNotNull('kategori')
      .groupBy('kategori')
      .orderBy('kategori', 'asc')

    const perGolongan = await this.db('public.kfa_codes')
      .select('golongan as kategori')
      .count('id as count')
      .where('is_active', true)
      .whereNotNull('golongan')
      .groupBy('golongan')
      .orderBy('golongan', 'asc')

    return {
      total: Number(total),
      perKategori: perKategori.map((r: Record<string, unknown>) => ({
        kategori: r.kategori as string,
        count: Number(r.count),
      })),
      perGolongan: perGolongan.map((r: Record<string, unknown>) => ({
        kategori: r.kategori as string,
        count: Number(r.count),
      })),
    }
  }

  // ===================================================
  // MAPPING — Lab→LOINC, Drug→KFA
  // ===================================================

  async mapLabParamToLoinc(labParamKode: string, loincCode: string): Promise<void> {
    // Verify LOINC code exists
    const loinc = await this.db('public.loinc_codes').where('code', loincCode).first()
    if (!loinc) throw new NotFoundError(`LOINC code '${loincCode}'`)

    // Verify lab param exists
    const param = await this.db('public.lab_parameters').where('kode', labParamKode).first()
    if (!param) throw new NotFoundError(`Lab parameter '${labParamKode}'`)

    await this.db('public.lab_parameters')
      .where('kode', labParamKode)
      .update({ loinc_code: loincCode })

    logger.info('Lab parameter mapped to LOINC', { labParamKode, loincCode })
  }

  async mapDrugToKfa(
    drugId: string,
    kfaCode: string,
    tenantSchema: string,
  ): Promise<void> {
    // Verify KFA code exists
    const kfa = await this.db('public.kfa_codes').where('code', kfaCode).first()
    if (!kfa) throw new NotFoundError(`KFA code '${kfaCode}'`)

    // Verify drug exists in tenant
    const drug = await this.db
      .withSchema(tenantSchema)
      .select('id')
      .from('drugs')
      .where('id', drugId)
      .first()

    if (!drug) throw new NotFoundError('Obat')

    await this.db
      .withSchema(tenantSchema)
      .from('drugs')
      .where('id', drugId)
      .update({ kfa_code: kfaCode })

    logger.info('Drug mapped to KFA', { drugId, kfaCode, tenantSchema })
  }

  async getUnmappedLabParams(): Promise<Array<{
    kode: string
    nama: string
    kategori: string
    loinc_code: string | null
  }>> {
    return this.db('public.lab_parameters')
      .select('kode', 'nama', 'kategori', 'loinc_code')
      .where('is_active', true)
      .orderBy('kategori', 'asc')
      .orderBy('kode', 'asc')
  }

  async getUnmappedDrugs(tenantSchema: string): Promise<Array<{
    id: string
    kode: string
    nama: string
    nama_generik: string | null
    kategori: string
    kfa_code: string | null
  }>> {
    return this.db
      .withSchema(tenantSchema)
      .select('id', 'kode', 'nama', 'nama_generik', 'kategori', 'kfa_code')
      .from('drugs')
      .where('is_active', true)
      .orderBy('nama', 'asc')
  }

  async autoMapDrugs(tenantSchema: string): Promise<{
    mapped: number
    total: number
    details: Array<{ drugId: string; drugName: string; kfaCode: string; kfaName: string }>
  }> {
    // Get all unmapped drugs
    const drugs = await this.db
      .withSchema(tenantSchema)
      .select('id', 'kode', 'nama', 'nama_generik')
      .from('drugs')
      .where('is_active', true)
      .whereNull('kfa_code')

    // Get all KFA codes
    const kfaCodes = await this.db('public.kfa_codes')
      .select('code', 'name', 'nama_dagang')
      .where('is_active', true)

    const details: Array<{
      drugId: string
      drugName: string
      kfaCode: string
      kfaName: string
    }> = []

    for (const drug of drugs) {
      const drugName = (drug.nama as string).toLowerCase().trim()
      const genericName = (drug.nama_generik as string | null)?.toLowerCase().trim() || ''

      // Try to find a match by name similarity
      let bestMatch: { code: string; name: string } | null = null
      let bestScore = 0

      for (const kfa of kfaCodes) {
        const kfaName = (kfa.name as string).toLowerCase()
        const kfaDagang = ((kfa.nama_dagang as string | null) || '').toLowerCase()

        // Simple scoring: count matching words
        const drugWords = drugName.split(/\s+/)
        const genericWords = genericName ? genericName.split(/\s+/) : []
        const kfaWords = kfaName.split(/\s+/)

        let matchCount = 0
        for (const word of drugWords) {
          if (word.length >= 3 && kfaWords.some((kw) => kw.includes(word) || word.includes(kw))) {
            matchCount += 2
          }
        }
        for (const word of genericWords) {
          if (word.length >= 3 && kfaWords.some((kw) => kw.includes(word) || word.includes(kw))) {
            matchCount += 2
          }
        }

        // Bonus if trade name matches
        if (kfaDagang && drugName.includes(kfaDagang)) {
          matchCount += 3
        }

        // Need at least 3 points for a match
        if (matchCount > bestScore && matchCount >= 3) {
          bestScore = matchCount
          bestMatch = { code: kfa.code as string, name: kfa.name as string }
        }
      }

      if (bestMatch) {
        await this.db
          .withSchema(tenantSchema)
          .from('drugs')
          .where('id', drug.id)
          .update({ kfa_code: bestMatch.code })

        details.push({
          drugId: drug.id as string,
          drugName: drug.nama as string,
          kfaCode: bestMatch.code,
          kfaName: bestMatch.name,
        })
      }
    }

    logger.info('Auto-map drugs to KFA completed', {
      tenantSchema,
      total: drugs.length,
      mapped: details.length,
    })

    return {
      mapped: details.length,
      total: drugs.length,
      details,
    }
  }
}
