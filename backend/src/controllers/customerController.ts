import { Request, Response } from 'express';
import { Customer } from '../models/Customer';
import { Appointment } from '../models/Appointment';
import { Service } from '../models/Service';

export class CustomerController {
  async createCustomer(req: Request, res: Response) {
    try {
      const { name, email, phone, preferredLanguage } = req.body;

      const existingCustomer = await Customer.findOne({ where: { email } });
      if (existingCustomer) {
        return res.json(existingCustomer);
      }

      const customer = await Customer.create({
        name,
        email,
        phone,
        preferredLanguage: preferredLanguage || 'zh',
      });

      res.status(201).json(customer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create customer' });
    }
  }

  async getCustomerById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await Customer.findByPk(id);

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      res.json(customer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch customer' });
    }
  }

  async updateCustomer(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const customer = await Customer.findByPk(id);

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const { name, phone, preferredLanguage } = req.body;
      await customer.update({ name, phone, preferredLanguage });

      res.json(customer);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }

  async getCustomerAppointments(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const appointments = await Appointment.findAll({
        where: { customerId: id },
        include: [Service],
        order: [['startTime', 'DESC']],
      });

      res.json(appointments);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch appointments' });
    }
  }
}