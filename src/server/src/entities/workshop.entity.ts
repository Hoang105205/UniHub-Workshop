import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Registration } from './registration.entity';

@Entity('workshops')
@Index('idx_workshops_start_time', ['startTime'])
export class Workshop {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  detail: string;

  @Column({ type: 'int' })
  capacity: number;

  @Column({ name: 'registered_count', type: 'int', default: 0 })
  registeredCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  price: string;

  @Column({ name: 'start_time', type: 'timestamptz' })
  startTime: Date;

  @Column({ name: 'end_time', type: 'timestamptz' })
  endTime: Date;

  @Column({ length: 100 })
  room: string;

  @Column({ length: 100 })
  speaker: string;

  @OneToMany(() => Registration, (registration) => registration.workshop)
  registrations: Registration[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
