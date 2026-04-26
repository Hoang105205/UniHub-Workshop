import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Registration } from './registration.entity';
import { User } from './user.entity';

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING_SYNC = 'pending_sync',
}

@Entity('check_ins')
export class CheckIn {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'registration_id', type: 'uuid', unique: true })
  registrationId: string;

  @Column({ name: 'staff_id', type: 'uuid' })
  staffId: string;

  @Column({ name: 'sync_status', type: 'enum', enum: SyncStatus })
  syncStatus: SyncStatus;

  @Column({ name: 'device_id', length: 100 })
  deviceId: string;

  @Column({ name: 'checked_in_at', type: 'timestamptz' })
  checkedInAt: Date;

  @OneToOne(() => Registration, (registration) => registration.checkIn, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'registration_id' })
  registration: Registration;

  @ManyToOne(() => User, (user) => user.checkIns, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'staff_id' })
  staff: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
