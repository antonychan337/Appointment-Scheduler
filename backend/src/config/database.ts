import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import { Owner } from '../models/Owner';
import { Service } from '../models/Service';
import { Appointment } from '../models/Appointment';
import { Customer } from '../models/Customer';

dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL || '', {
  dialect: 'postgres',
  logging: false,
  models: [Owner, Service, Appointment, Customer],
});

export default sequelize;