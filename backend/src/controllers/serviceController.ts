import { Request, Response } from 'express';
import { Service } from '../models/Service';

export class ServiceController {
  async getAllServices(req: Request, res: Response) {
    try {
      const services = await Service.findAll();
      res.json(services);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  }

  async getServicesByOwner(req: Request, res: Response) {
    try {
      const { ownerId } = req.params;
      const services = await Service.findAll({
        where: { ownerId, isActive: true },
      });
      res.json(services);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  }

  async getServiceById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const service = await Service.findByPk(id);

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      res.json(service);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to fetch service' });
    }
  }

  async createService(req: any, res: Response) {
    try {
      const {
        nameEn,
        nameZh,
        durationMinutes,
        activeTimeMinutes,
        price,
      } = req.body;

      const service = await Service.create({
        ownerId: req.ownerId,
        nameEn,
        nameZh,
        durationMinutes,
        activeTimeMinutes,
        price,
        isDefault: false,
      });

      res.status(201).json(service);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }

  async updateService(req: any, res: Response) {
    try {
      const { id } = req.params;
      const service = await Service.findOne({
        where: { id, ownerId: req.ownerId },
      });

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const {
        nameEn,
        nameZh,
        durationMinutes,
        activeTimeMinutes,
        price,
        isActive,
      } = req.body;

      await service.update({
        nameEn,
        nameZh,
        durationMinutes,
        activeTimeMinutes,
        price,
        isActive,
      });

      res.json(service);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update service' });
    }
  }

  async deleteService(req: any, res: Response) {
    try {
      const { id } = req.params;
      const service = await Service.findOne({
        where: { id, ownerId: req.ownerId },
      });

      if (!service) {
        return res.status(404).json({ error: 'Service not found' });
      }

      await service.update({ isActive: false });

      res.json({ message: 'Service deactivated successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to delete service' });
    }
  }

  async seedDefaultServices(req: any, res: Response) {
    try {
      const { ownerId } = req.params;

      const defaultServices = [
        {
          nameEn: "Men's Cut",
          nameZh: '男士理发',
          durationMinutes: 30,
          activeTimeMinutes: 30,
          price: 25,
        },
        {
          nameEn: "Women's Cut",
          nameZh: '女士理发',
          durationMinutes: 45,
          activeTimeMinutes: 45,
          price: 35,
        },
        {
          nameEn: "Children's Cut",
          nameZh: '儿童理发',
          durationMinutes: 20,
          activeTimeMinutes: 20,
          price: 15,
        },
        {
          nameEn: 'Hair Coloring',
          nameZh: '染发',
          durationMinutes: 90,
          activeTimeMinutes: 30,
          price: 80,
        },
        {
          nameEn: 'Highlights',
          nameZh: '挑染',
          durationMinutes: 120,
          activeTimeMinutes: 40,
          price: 120,
        },
      ];

      const createdServices = await Promise.all(
        defaultServices.map((service) =>
          Service.create({
            ...service,
            ownerId,
            isDefault: true,
          })
        )
      );

      res.status(201).json(createdServices);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to seed default services' });
    }
  }
}