import {
  Entity, PrimaryGeneratedColumn, Column,
  ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Plan } from './plan.entity';

export enum SubscriptionStatus {
  ACTIVE    = 'ACTIVE',
  EXPIRED   = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  TRIAL     = 'TRIAL',
}

@Entity('subscriptions')
export class Subscription {
  // ts(2564): ! tells TypeScript TypeORM will assign these at runtime
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id' })
  companyId!: string;

  @ManyToOne(() => Plan, { nullable: false, eager: true })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'plan_id' })
  planId!: string;

  @Column({
    type: 'enum',
    enum: SubscriptionStatus,
    default: SubscriptionStatus.TRIAL,
  })
  status!: SubscriptionStatus;

  @Column({ type: 'timestamp' })
  startsAt!: Date;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ type: 'int', default: 0 })
  invoicesUsedThisMonth!: number;

  @Column({ type: 'timestamp', nullable: true })
  lastResetAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  get isValid(): boolean {
    return (
      (this.status === SubscriptionStatus.ACTIVE ||
        this.status === SubscriptionStatus.TRIAL) &&
      new Date() < new Date(this.expiresAt)
    );
  }

  get invoicesRemaining(): number {
    if (this.plan.invoicesPerMonth === -1) return Infinity;
    return Math.max(0, this.plan.invoicesPerMonth - this.invoicesUsedThisMonth);
  }
}