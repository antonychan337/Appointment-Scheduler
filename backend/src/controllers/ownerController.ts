import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { Owner } from '../models/Owner';

export class OwnerController {
  async register(req: Request, res: Response) {
    try {
      const { name, email, password, phone } = req.body;

      const existingOwner = await Owner.findOne({ where: { email } });
      if (existingOwner) {
        return res.status(400).json({ error: 'Email already registered' });
      }

      const owner = await Owner.create({ name, email, password, phone });

      const token = jwt.sign(
        { ownerId: owner.id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      res.json({ owner, token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      const owner = await Owner.findOne({ where: { email } });
      if (!owner) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const isValid = await owner.validatePassword(password);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { ownerId: owner.id },
        process.env.JWT_SECRET || 'secret',
        { expiresIn: '7d' }
      );

      res.json({ owner, token });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Login failed' });
    }
  }

  async getProfile(req: any, res: Response) {
    try {
      const owner = await Owner.findByPk(req.ownerId, {
        attributes: { exclude: ['password'] },
      });

      if (!owner) {
        return res.status(404).json({ error: 'Owner not found' });
      }

      res.json(owner);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  async updateProfile(req: any, res: Response) {
    try {
      const owner = await Owner.findByPk(req.ownerId);

      if (!owner) {
        return res.status(404).json({ error: 'Owner not found' });
      }

      const { name, phone } = req.body;
      await owner.update({ name, phone });

      res.json(owner);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  async updateStoreHours(req: any, res: Response) {
    try {
      const owner = await Owner.findByPk(req.ownerId);

      if (!owner) {
        return res.status(404).json({ error: 'Owner not found' });
      }

      const { storeHours } = req.body;
      await owner.update({ storeHours });

      res.json(owner);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update store hours' });
    }
  }

  async updateCancellationPolicy(req: any, res: Response) {
    try {
      const owner = await Owner.findByPk(req.ownerId);

      if (!owner) {
        return res.status(404).json({ error: 'Owner not found' });
      }

      const { cancellationNoticeHours } = req.body;
      await owner.update({ cancellationNoticeHours });

      res.json(owner);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: 'Failed to update cancellation policy' });
    }
  }
}