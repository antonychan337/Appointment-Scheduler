import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  BeforeCreate,
  BeforeUpdate,
} from 'sequelize-typescript';
import bcrypt from 'bcrypt';
import { Service } from './Service';
import { Appointment } from './Appointment';

interface StoreHours {
  [day: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

@Table({
  tableName: 'owners',
  timestamps: true,
})
export class Owner extends Model {
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
    unique: true,
  })
  email!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  password!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  phone!: string;

  @Column({
    type: DataType.JSONB,
    defaultValue: {
      monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      wednesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      saturday: { isOpen: true, openTime: '09:00', closeTime: '17:00' },
      sunday: { isOpen: false, openTime: '', closeTime: '' },
    },
  })
  storeHours!: StoreHours;

  @Column({
    type: DataType.INTEGER,
    defaultValue: 24,
  })
  cancellationNoticeHours!: number;

  @HasMany(() => Service)
  services!: Service[];

  @HasMany(() => Appointment)
  appointments!: Appointment[];

  @BeforeCreate
  @BeforeUpdate
  static async hashPassword(instance: Owner) {
    if (instance.changed('password')) {
      const salt = await bcrypt.genSalt(10);
      instance.password = await bcrypt.hash(instance.password, salt);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}