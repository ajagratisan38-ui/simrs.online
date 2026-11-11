import { Router } from 'express'
import { AssetController } from './asset.controller'
import { AssetService } from './asset.service'
import { db } from '../../config/database'
import { authenticate } from '../../middleware/authenticate'
import { checkPermission } from '../../middleware/index'

const assetService = new AssetService(db)
const assetController = new AssetController(assetService)

export const assetRouter = Router()

assetRouter.use(authenticate)

// Stats & reports
assetRouter.get('/stats', checkPermission('admin:manage'), assetController.getStats)
assetRouter.get('/depreciation', checkPermission('admin:manage'), assetController.getDepreciationReport)
assetRouter.get('/locations', assetController.getLocations)
assetRouter.get('/generate-kode', assetController.generateKode)

// Assets CRUD
assetRouter.get('/', assetController.listAssets)
assetRouter.get('/:id', assetController.getAsset)
assetRouter.post('/', checkPermission('admin:manage'), assetController.createAsset)
assetRouter.put('/:id', checkPermission('admin:manage'), assetController.updateAsset)
assetRouter.delete('/:id', checkPermission('admin:manage'), assetController.deleteAsset)

// Maintenances
assetRouter.get('/maintenances/list', assetController.listMaintenances)
assetRouter.post('/maintenances', checkPermission('admin:manage'), assetController.addMaintenance)
assetRouter.delete('/maintenances/:id', checkPermission('admin:manage'), assetController.deleteMaintenance)

// Mutations
assetRouter.get('/mutations/list', assetController.listMutations)
assetRouter.post('/mutations', checkPermission('admin:manage'), assetController.addMutation)
