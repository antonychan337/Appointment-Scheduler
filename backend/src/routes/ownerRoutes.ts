import { Router } from 'express';
import { OwnerController } from '../controllers/ownerController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const ownerController = new OwnerController();

router.post('/register', ownerController.register);
router.post('/login', ownerController.login);
router.get('/profile', authMiddleware, ownerController.getProfile);
router.put('/profile', authMiddleware, ownerController.updateProfile);
router.put('/store-hours', authMiddleware, ownerController.updateStoreHours);
router.put('/cancellation-policy', authMiddleware, ownerController.updateCancellationPolicy);

export default router;