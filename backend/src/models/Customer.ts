import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { Appointment } from './Appointment';

@Table({
  tableName: 'customers',
  timestamps: true,
})
export class Customer extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  phone!: string;

  @Column({
    type: DataType.ENUM('en', 'zh'),
    defaultValue: 'zh',
  })
  preferredLanguage!: 'en' | 'zh';

  @HasMany(() => Appointment)
  appointments!: Appointment[];
}