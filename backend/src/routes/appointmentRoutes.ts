import { Router } from 'express';
import { AppointmentController } from '../controllers/appointmentController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const appointmentController = new AppointmentController();

router.post('/', appointmentController.createAppointment);
router.get('/owner/:ownerId', authMiddleware, appointmentController.getOwnerAppointments);
router.get('/customer/:customerId', appointmentController.getCustomerAppointments);
router.get('/available-slots', appointmentController.getAvailableSlots);
router.get('/:id', appointmentController.getAppointmentById);
router.put('/:id', appointmentController.updateAppointment);
router.delete('/:id', appointmentController.cancelAppointment);

export default router;