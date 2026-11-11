import { apiClient } from './client'

export interface AdimeAssessment {
  bb?: number
  tb?: number
  imt?: number
  lla?: number
  albumin?: number
  hb?: number
  gds?: number
  fisik?: string
  riwayat_makan?: string
  riwayat_penyakit?: string
}

export interface AdimeIntervention {
  jenis_diet?: string
  bentuk_makanan?: string
  jalur_pemberian?: string
  frekuensi?: string
  keterangan?: string
}

export interface AdimeMonitoring {
  parameter?: string[]
  frekuensi?: string
  catatan?: string
}

export interface AdimeEvaluation {
  hasil?: 'membaik' | 'memburuk' | 'tetap'
  target_tercapai?: boolean
  catatan?: string
  tindak_lanjut?: string
}

export interface NutritionOrderRow {
  id: string
  visit_id: string
  patient_id: string
  diet_type: string
  kalori_target: number
  protein_target?: number
  karbohidrat_target?: number
  lemak_target?: number
  catatan_diet?: string
  alergi_makanan?: string[]
  pantangan?: string[]
  status: string
  patient_nama?: string
  no_rekam_medis?: string
  visit_number?: string
  assessment_bb?: number
  assessment_tb?: number
  assessment_imt?: number
  assessment_lla?: number
  assessment_albumin?: number
  assessment_hb?: number
  assessment_gds?: number
  assessment_fisik?: string
  assessment_riwayat_makan?: string
  assessment_riwayat_penyakit?: string
  diagnosis_gizi?: string
  intervention_jenis_diet?: string
  intervention_bentuk_makanan?: string
  intervention_jalur_pemberian?: string
  intervention_frekuensi?: string
  intervention_keterangan?: string
  monitoring_parameter?: string[]
  monitoring_frekuensi?: string
  monitoring_catatan?: string
  evaluation_hasil?: string
  evaluation_target_tercapai?: boolean
  evaluation_catatan?: string
  evaluation_tindak_lanjut?: string
  logs?: NutritionLogRow[]
  created_at: string
  updated_at?: string
  [key: string]: unknown
}

export interface NutritionOrderInput {
  visit_id: string
  patient_id: string
  diet_type: string
  kalori_target: number
  protein_target?: number
  karbohidrat_target?: number
  lemak_target?: number
  catatan_diet?: string
  alergi_makanan?: string[]
  pantangan?: string[]
  assessment?: AdimeAssessment
  diagnosis_gizi?: string
  intervention?: AdimeIntervention
  monitoring?: AdimeMonitoring
  evaluation?: AdimeEvaluation
}

export interface NutritionLogInput {
  nutrition_order_id: string
  waktu_makan: 'pagi' | 'siang' | 'sore' | 'snack_pagi' | 'snack_sore'
  menu: string
  porsi_disajikan: number
  porsi_dimakan: number
  catatan?: string
}

export interface NutritionLogRow {
  id: string
  nutrition_order_id: string
  tanggal: string
  waktu_makan: string
  menu: string
  porsi_disajikan: number
  porsi_dimakan: number
  catatan?: string
  created_at: string
}

export async function listNutritionOrders(params?: {
  status?: string
  page?: number
  limit?: number
}) {
  const sp = new URLSearchParams()
  if (params?.status) sp.set('status', params.status)
  if (params?.page) sp.set('page', String(params.page))
  if (params?.limit) sp.set('limit', String(params.limit))
  const qs = sp.toString()
  return apiClient<{
    success: boolean
    data: NutritionOrderRow[]
    meta: { page: number; limit: number; total: number; totalPages: number }
  }>(`/nutrition${qs ? `?${qs}` : ''}`)
}

export async function getNutritionOrder(id: string) {
  const res = await apiClient<{ success: boolean; data: NutritionOrderRow }>(`/nutrition/${id}`)
  return res.data
}

export async function getNutritionByVisit(visitId: string) {
  const res = await apiClient<{ success: boolean; data: NutritionOrderRow[] }>(
    `/nutrition/visit/${visitId}`,
  )
  return res.data
}

export async function createNutritionOrder(input: NutritionOrderInput) {
  const res = await apiClient<{ success: boolean; data: NutritionOrderRow }>('/nutrition', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateNutritionOrder(
  id: string,
  input: Partial<NutritionOrderInput> & { status?: string },
) {
  const res = await apiClient<{ success: boolean; data: NutritionOrderRow }>(`/nutrition/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function addNutritionLog(input: NutritionLogInput) {
  const res = await apiClient<{ success: boolean; data: NutritionLogRow }>('/nutrition/logs', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

// ═══════ NUTRITION CALCULATOR ═══════

export interface NutritionCalcInput {
  bb: number
  tb: number
  umur: number
  jenis_kelamin: 'L' | 'P'
  aktivitas: 'bedrest' | 'ringan' | 'sedang' | 'berat'
  stress_factor?: number
}

export interface NutritionCalcResult {
  bmr_harris_benedict: number
  bmr_mifflin: number
  tdee_harris_benedict: number
  tdee_mifflin: number
  kalori_rekomendasi: number
  protein_g: number
  karbohidrat_g: number
  lemak_g: number
  protein_per_kg: number
  imt: number
  status_imt: string
  berat_badan_ideal: number
  activity_factor: number
  stress_factor: number
}

export async function calculateNutrition(input: NutritionCalcInput) {
  const res = await apiClient<{ success: boolean; data: NutritionCalcResult }>('/nutrition/calculate', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

// ═══════ FOOD ITEMS ═══════

export interface FoodItemRow {
  id: string
  nama: string
  kategori: string
  satuan: string
  kalori_per_unit: number
  protein_per_unit: number
  karbohidrat_per_unit: number
  lemak_per_unit: number
  harga_per_unit: number
  is_active: boolean
  created_at: string
}

export interface FoodItemInput {
  nama: string
  kategori: string
  satuan?: string
  kalori_per_unit?: number
  protein_per_unit?: number
  karbohidrat_per_unit?: number
  lemak_per_unit?: number
  harga_per_unit?: number
}

export async function listFoodItems(params?: { kategori?: string; search?: string }) {
  const sp = new URLSearchParams()
  if (params?.kategori) sp.set('kategori', params.kategori)
  if (params?.search) sp.set('search', params.search)
  const qs = sp.toString()
  const res = await apiClient<{ success: boolean; data: FoodItemRow[] }>(`/nutrition/food-items${qs ? `?${qs}` : ''}`)
  return res.data
}

export async function createFoodItem(input: FoodItemInput) {
  const res = await apiClient<{ success: boolean; data: FoodItemRow }>('/nutrition/food-items', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function updateFoodItem(id: string, input: Partial<FoodItemInput>) {
  const res = await apiClient<{ success: boolean; data: FoodItemRow }>(`/nutrition/food-items/${id}`, {
    method: 'PUT',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function deleteFoodItem(id: string) {
  return apiClient(`/nutrition/food-items/${id}`, { method: 'DELETE' })
}

// ═══════ MEAL PLANS ═══════

export interface MealPlanItemInput {
  waktu_makan: 'pagi' | 'snack_pagi' | 'siang' | 'snack_sore' | 'sore'
  food_item_id?: string
  nama_menu: string
  porsi?: number
  satuan?: string
  kalori?: number
  protein?: number
  karbohidrat?: number
  lemak?: number
  harga?: number
}

export interface MealPlanInput {
  nama: string
  diet_type: string
  catatan?: string
  items: MealPlanItemInput[]
}

export interface MealPlanRow {
  id: string
  nama: string
  diet_type: string
  kalori_total: number
  protein_total: number
  karbohidrat_total: number
  lemak_total: number
  total_cost: number
  catatan?: string
  is_active: boolean
  items?: MealPlanItemRow[]
  created_at: string
}

export interface MealPlanItemRow {
  id: string
  meal_plan_id: string
  waktu_makan: string
  food_item_id?: string
  food_item_nama?: string
  food_item_kategori?: string
  nama_menu: string
  porsi: number
  satuan: string
  kalori: number
  protein: number
  karbohidrat: number
  lemak: number
  harga: number
}

export async function listMealPlans(search?: string) {
  const sp = new URLSearchParams()
  if (search) sp.set('search', search)
  const qs = sp.toString()
  const res = await apiClient<{ success: boolean; data: MealPlanRow[] }>(`/nutrition/meal-plans${qs ? `?${qs}` : ''}`)
  return res.data
}

export async function getMealPlan(id: string) {
  const res = await apiClient<{ success: boolean; data: MealPlanRow }>(`/nutrition/meal-plans/${id}`)
  return res.data
}

export async function createMealPlan(input: MealPlanInput) {
  const res = await apiClient<{ success: boolean; data: MealPlanRow }>('/nutrition/meal-plans', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return res.data
}

export async function deleteMealPlan(id: string) {
  return apiClient(`/nutrition/meal-plans/${id}`, { method: 'DELETE' })
}

// ═══════ FOOD COST ═══════

export interface FoodCostSummary {
  period: { from: string; to: string }
  servings: {
    total: number
    porsi_disajikan: number
    porsi_dimakan: number
    waste_percentage: number
  }
  meal_plans: {
    total: number
    total_cost: number
    avg_cost_per_plan: number
  }
  active_orders: number
}

export async function getFoodCostSummary(from?: string, to?: string) {
  const sp = new URLSearchParams()
  if (from) sp.set('from', from)
  if (to) sp.set('to', to)
  const qs = sp.toString()
  const res = await apiClient<{ success: boolean; data: FoodCostSummary }>(`/nutrition/food-cost${qs ? `?${qs}` : ''}`)
  return res.data
}
