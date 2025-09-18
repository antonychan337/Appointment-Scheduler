import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Owner } from './Owner';
import { Customer } from './Customer';
import { Service } from './Service';

@Table({
  tableName: 'appointments',
  timestamps: true,
})
export class Appointment extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  id!: string;

  @ForeignKey(() => Owner)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  ownerId!: string;

  @ForeignKey(() => Customer)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  customerId!: string;

  @ForeignKey(() => Service)
  @Column({
    type: DataType.UUID,
    allowNull: false,
  })
  serviceId!: string;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  startTime!: Date;

  @Column({
    type: DataType.DATE,
    allowNull: false,
  })
  endTime!: Date;

  @Column({
    type: DataType.ENUM('confirmed', 'cancelled', 'completed'),
    defaultValue: 'confirmed',
  })
  status!: 'confirmed' | 'cancelled' | 'completed';

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  totalPrice!: number;

  @Column({
    type: DataType.TEXT,
  })
  notes?: string;

  @BelongsTo(() => Owner)
  owner!: Owner;

  @BelongsTo(() => Customer)
  customer!: Customer;

  @BelongsTo(() => Service)
  service!: Service;
}