import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const serviceController = new ServiceController();

router.get('/', serviceController.getAllServices);
router.get('/owner/:ownerId', serviceController.getServicesByOwner);
router.get('/:id', serviceController.getServiceById);
router.post('/', authMiddleware, serviceController.createService);
router.put('/:id', authMiddleware, serviceController.updateService);
router.delete('/:id', authMiddleware, serviceController.deleteService);
router.post('/seed-defaults/:ownerId', authMiddleware, serviceController.seedDefaultServices);

export default router;