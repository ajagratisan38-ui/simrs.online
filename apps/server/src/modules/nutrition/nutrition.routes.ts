import { Router } from 'express'
import { NutritionController } from './nutrition.controller'
import { NutritionService } from './nutrition.service'
import { authenticate } from '../../middleware/authenticate'
import { checkAnyPermission } from '../../middleware/check-permission'
import { db } from '../../config/database'

const service = new NutritionService(db)
const controller = new NutritionController(service)

export const nutritionRouter = Router()
nutritionRouter.use(authenticate)

const read = checkAnyPermission('medical-record:read', 'patient:read')
const write = checkAnyPermission('medical-record:create', 'medical-record:update')

// Orders
nutritionRouter.get('/', read, controller.listOrders)
nutritionRouter.post('/', write, controller.createOrder)
nutritionRouter.get('/:id', read, controller.getOrder)
nutritionRouter.put('/:id', write, controller.updateOrder)
nutritionRouter.get('/visit/:visitId', read, controller.getByVisit)
nutritionRouter.post('/logs', write, controller.addLog)

// Calculator
nutritionRouter.post('/calculate', read, controller.calculate)

// Food Items (master bahan makanan)
nutritionRouter.get('/food-items', read, controller.listFoodItems)
nutritionRouter.post('/food-items', write, controller.createFoodItem)
nutritionRouter.put('/food-items/:id', write, controller.updateFoodItem)
nutritionRouter.delete('/food-items/:id', write, controller.deleteFoodItem)

// Meal Plans
nutritionRouter.get('/meal-plans', read, controller.listMealPlans)
nutritionRouter.post('/meal-plans', write, controller.createMealPlan)
nutritionRouter.get('/meal-plans/:id', read, controller.getMealPlan)
nutritionRouter.delete('/meal-plans/:id', write, controller.deleteMealPlan)

// Food Cost
nutritionRouter.get('/food-cost', read, controller.foodCostSummary)
