import {
  Table,
  Column,
  Model,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Owner } from './Owner';
import { Appointment } from './Appointment';

@Table({
  tableName: 'services',
  timestamps: true,
})
export class Service extends Model {
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

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  nameEn!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  nameZh!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Total duration in minutes',
  })
  durationMinutes!: number;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
    comment: 'Active time when owner is needed in minutes',
  })
  activeTimeMinutes!: number;

  @Column({
    type: DataType.DECIMAL(10, 2),
    allowNull: false,
  })
  price!: number;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: false,
  })
  isDefault!: boolean;

  @Column({
    type: DataType.BOOLEAN,
    defaultValue: true,
  })
  isActive!: boolean;

  @BelongsTo(() => Owner)
  owner!: Owner;

  @HasMany(() => Appointment)
  appointments!: Appointment[];
}