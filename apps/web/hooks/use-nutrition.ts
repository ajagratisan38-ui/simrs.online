'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listNutritionOrders,
  getNutritionOrder,
  getNutritionByVisit,
  createNutritionOrder,
  updateNutritionOrder,
  addNutritionLog,
  calculateNutrition,
  listFoodItems,
  createFoodItem,
  updateFoodItem,
  deleteFoodItem,
  listMealPlans,
  getMealPlan,
  createMealPlan,
  deleteMealPlan,
  getFoodCostSummary,
} from '@/lib/api/nutrition'
import type {
  NutritionOrderInput,
  NutritionLogInput,
  NutritionCalcInput,
  FoodItemInput,
  MealPlanInput,
} from '@/lib/api/nutrition'

export function useNutritionOrders(params?: {
  status?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['nutrition-orders', params],
    queryFn: () => listNutritionOrders(params),
    staleTime: 30_000,
  })
}

export function useNutritionOrder(id: string) {
  return useQuery({
    queryKey: ['nutrition-orders', id],
    queryFn: () => getNutritionOrder(id),
    enabled: !!id,
  })
}

export function useNutritionByVisit(visitId: string) {
  return useQuery({
    queryKey: ['nutrition-visit', visitId],
    queryFn: () => getNutritionByVisit(visitId),
    enabled: !!visitId,
  })
}

export function useCreateNutritionOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NutritionOrderInput) => createNutritionOrder(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-orders'] }),
  })
}

export function useUpdateNutritionOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<NutritionOrderInput> & { status?: string } }) =>
      updateNutritionOrder(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-orders'] }),
  })
}

export function useAddNutritionLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: NutritionLogInput) => addNutritionLog(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['nutrition-orders'] }),
  })
}

// ═══════ NUTRITION CALCULATOR ═══════

export function useCalculateNutrition() {
  return useMutation({
    mutationFn: (data: NutritionCalcInput) => calculateNutrition(data),
  })
}

// ═══════ FOOD ITEMS ═══════

export function useFoodItems(params?: { kategori?: string; search?: string }) {
  return useQuery({
    queryKey: ['food-items', params],
    queryFn: () => listFoodItems(params),
    staleTime: 60_000,
  })
}

export function useCreateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: FoodItemInput) => createFoodItem(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-items'] }),
  })
}

export function useUpdateFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FoodItemInput> }) => updateFoodItem(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-items'] }),
  })
}

export function useDeleteFoodItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFoodItem(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['food-items'] }),
  })
}

// ═══════ MEAL PLANS ═══════

export function useMealPlans(search?: string) {
  return useQuery({
    queryKey: ['meal-plans', search],
    queryFn: () => listMealPlans(search),
    staleTime: 30_000,
  })
}

export function useMealPlan(id: string) {
  return useQuery({
    queryKey: ['meal-plans', id],
    queryFn: () => getMealPlan(id),
    enabled: !!id,
  })
}

export function useCreateMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: MealPlanInput) => createMealPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans'] }),
  })
}

export function useDeleteMealPlan() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMealPlan(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meal-plans'] }),
  })
}

// ═══════ FOOD COST ═══════

export function useFoodCostSummary(from?: string, to?: string) {
  return useQuery({
    queryKey: ['food-cost', from, to],
    queryFn: () => getFoodCostSummary(from, to),
    staleTime: 60_000,
  })
}
