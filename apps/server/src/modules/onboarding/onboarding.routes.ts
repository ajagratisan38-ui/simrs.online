import { Router } from 'express'
import { OnboardingController } from './onboarding.controller'
import { OnboardingService } from './onboarding.service'
import { authenticate } from '../../middleware/authenticate'
import { db } from '../../config/database'

const service = new OnboardingService(db)
const controller = new OnboardingController(service)

export const onboardingRouter = Router()
onboardingRouter.use(authenticate)

onboardingRouter.get('/status', controller.getStatus)
onboardingRouter.put('/profile', controller.updateProfile)
onboardingRouter.post('/rooms', controller.addRoom)
onboardingRouter.post('/doctors', controller.addDoctor)
onboardingRouter.post('/complete', controller.complete)
onboardingRouter.post('/skip', controller.skip)
