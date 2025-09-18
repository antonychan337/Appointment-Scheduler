import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';

const router = Router();
const customerController = new CustomerController();

router.post('/register', customerController.createCustomer);
router.get('/:id', customerController.getCustomerById);
router.put('/:id', customerController.updateCustomer);
router.get('/:id/appointments', customerController.getCustomerAppointments);

export default router;