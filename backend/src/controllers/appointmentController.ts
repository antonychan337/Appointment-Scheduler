import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Appointment } from '../models/Appointment';
import { Service } from '../models/Service';
import { Customer } from '../models/Customer';
import { Owner } from '../models/Owner';
import { EmailService } from '../services/emailService';

export class AppointmentController {
  private emailService = new EmailService();

  async createAppointment(req: Request, res: Response) {
    try {
      const {
        ownerId,
        customerId,
        serviceId,
        startTime,
        customerData,
      } = req.body;

      let customer = customerId ? await Customer.findByPk(customerId) : null;

      if (!customer && customerData) {
        customer = await Customer.create(customerData);
      }

      if (!customer) {
        return res.status(400).json({ error: 'Customer information required' });
      }

      const service = await Service.findByPk(serviceId);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + service.durationMinutes * 60000);

      const conflictingAppointment = await Appointment.findOne({
        where: {
          ownerId,
          status: 'confirmed',
          [Op.or]: [
            {
              startTime: {
                [Op.between]: [startDate, endDate],
              },
            },
            {
              endTime: {
                [Op.between]: [startDate, endDate],
              },
            },
          ],
        },
      });

      if (conflictingAppointment) {
        return res.status(400).json({ error: 'Time slot not available' });
      }

      const appointment = await Appointment.create({
        ownerId,
        customerId: customer.id,
        serviceId,
        startTime: startDate,
        endTime: endDate,
        totalPrice: service.price,
        status: 'confirmed',
      });

      await this.emailService.sendConfirmationEmail(
        customer.email,
        appointment,
        service,
        customer.preferredLanguage
      );

      res.status(201).json(appointment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create appointment' });
    }
  }

  async getOwnerAppointments(req: any, res: Response) {
    try {
      const { ownerId } = req.params;
      const { date, startDate, endDate } = req.query;

      const whereClause: any = { ownerId, status: 'confirmed' };

      if (date) {
        const targetDate = new Date(date as string);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);
        whereClause.startTime = {
          [Op.between]: [targetDate, nextDay],
        };
      } else if (startDate && endDate) {
        whereClause.startTime = {
          [Op.between]: [new Date(startDate as string), new Date(endDate as string)],
        };
      }

      const appointments = await Appointment.findAll({
        where: whereClause,
        include: [Customer, Service],
        order: [['startTime', 'ASC']],
      });

      res.json(appointments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  }

  async getCustomerAppointments(req: Request, res: Response) {
    try {
      const { customerId } = req.params;
      const appointments = await Appointment.findAll({
        where: { customerId, status: { [Op.ne]: 'cancelled' } },
        include: [Service, Owner],
        order: [['startTime', 'DESC']],
      });

      res.json(appointments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  }

  async getAvailableSlots(req: Request, res: Response) {
    try {
      const { ownerId, serviceId, date } = req.query;

      const owner = await Owner.findByPk(ownerId as string);
      if (!owner) {
        return res.status(404).json({ error: 'Owner not found' });
      }

      const service = await Service.findByPk(serviceId as string);
      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const targetDate = new Date(date as string);
      const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const storeHours = owner.storeHours[dayOfWeek];

      if (!storeHours || !storeHours.isOpen) {
        return res.json({ slots: [] });
      }

      const appointments = await Appointment.findAll({
        where: {
          ownerId: ownerId as string,
          status: 'confirmed',
          startTime: {
            [Op.between]: [
              targetDate,
              new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
            ],
          },
        },
        order: [['startTime', 'ASC']],
      });

      const slots = await this.calculateAvailableSlots(
        storeHours,
        appointments,
        service,
        targetDate
      );

      res.json({ slots });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch available slots' });
    }
  }

  private async calculateAvailableSlots(
    storeHours: any,
    appointments: Appointment[],
    service: Service,
    date: Date
  ): Promise<string[]> {
    const slots: string[] = [];
    const [openHour, openMinute] = storeHours.openTime.split(':').map(Number);
    const [closeHour, closeMinute] = storeHours.closeTime.split(':').map(Number);

    const openTime = new Date(date);
    openTime.setHours(openHour, openMinute, 0, 0);

    const closeTime = new Date(date);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    const slotDuration = 15;
    const serviceDuration = service.durationMinutes;
    const activeTime = service.activeTimeMinutes;

    for (let time = openTime; time <= closeTime; time.setMinutes(time.getMinutes() + slotDuration)) {
      const slotEnd = new Date(time.getTime() + serviceDuration * 60000);

      if (slotEnd > closeTime) break;

      const activeStart = new Date(time);
      const activeEnd = new Date(time.getTime() + activeTime * 60000);

      const processingStart = new Date(activeEnd);
      const processingEnd = new Date(slotEnd);

      let isAvailable = true;

      for (const apt of appointments) {
        const aptService = await Service.findByPk(apt.serviceId);
        if (!aptService) continue;

        const aptActiveStart = new Date(apt.startTime);
        const aptActiveEnd = new Date(apt.startTime.getTime() + aptService.activeTimeMinutes * 60000);

        if (
          (activeStart >= aptActiveStart && activeStart < aptActiveEnd) ||
          (activeEnd > aptActiveStart && activeEnd <= aptActiveEnd) ||
          (aptActiveStart >= activeStart && aptActiveStart < activeEnd)
        ) {
          isAvailable = false;
          break;
        }

        if (processingStart < processingEnd) {
          const aptProcessingEnd = new Date(apt.endTime);
          if (
            (processingStart >= aptActiveStart && processingStart < aptActiveEnd) ||
            (processingEnd > aptActiveStart && processingEnd <= aptActiveEnd)
          ) {
            isAvailable = false;
            break;
          }
        }
      }

      if (isAvailable) {
        slots.push(time.toISOString());
      }
    }

    return slots;
  }

  async getAppointmentById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const appointment = await Appointment.findByPk(id, {
        include: [Customer, Service, Owner],
      });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      res.json(appointment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch appointment' });
    }
  }

  async updateAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { startTime } = req.body;

      const appointment = await Appointment.findByPk(id);
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const owner = await Owner.findByPk(appointment.ownerId);
      const hoursUntilAppointment =
        (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < owner!.cancellationNoticeHours) {
        return res.status(400).json({
          error: `Cannot modify appointment within ${owner!.cancellationNoticeHours} hours`,
        });
      }

      if (startTime) {
        const service = await Service.findByPk(appointment.serviceId);
        const newStartTime = new Date(startTime);
        const newEndTime = new Date(
          newStartTime.getTime() + service!.durationMinutes * 60000
        );

        await appointment.update({
          startTime: newStartTime,
          endTime: newEndTime,
        });
      }

      res.json(appointment);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update appointment' });
    }
  }

  async cancelAppointment(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const appointment = await Appointment.findByPk(id);
      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      const owner = await Owner.findByPk(appointment.ownerId);
      const hoursUntilAppointment =
        (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);

      if (hoursUntilAppointment < owner!.cancellationNoticeHours) {
        return res.status(400).json({
          error: `Cannot cancel appointment within ${owner!.cancellationNoticeHours} hours`,
        });
      }

      await appointment.update({ status: 'cancelled' });

      res.json({ message: 'Appointment cancelled successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to cancel appointment' });
    }
  }
}