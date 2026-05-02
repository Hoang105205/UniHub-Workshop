import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Workshop } from './workshop.entity';
import { Payment } from './payment.entity';
import { CheckIn } from './check-in.entity';

export enum RegistrationStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  SYSTEM_FAILURE = 'system_failure',
  CHECKED_IN = 'checked_in',
}

@Entity('registrations')
@Index('uq_registrations_workshop_user', ['workshopId', 'userId'], {
  unique: true,
})
export class Registration {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'workshop_id', type: 'uuid' })
  workshopId: string;

  @Column({
    type: 'enum',
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @Column({ name: 'qr_code', unique: true, length: 255, nullable: true })
  qrCode: string;

  @CreateDateColumn({ name: 'registered_at' })
  registeredAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @ManyToOne(() => User, (user) => user.registrations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Workshop, (workshop) => workshop.registrations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workshop_id' })
  workshop: Workshop;

  @OneToOne(() => Payment, (payment) => payment.registration)
  payment: Payment;

  @OneToOne(() => CheckIn, (checkIn) => checkIn.registration)
  checkIn: CheckIn;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
