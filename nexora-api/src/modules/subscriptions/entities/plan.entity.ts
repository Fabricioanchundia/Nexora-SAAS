import {
  Entity, PrimaryGeneratedColumn, Column,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';

export enum PlanCode {
  FREE         = 'FREE',
  STARTER      = 'STARTER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE   = 'ENTERPRISE',
}

@Entity('plans')
export class Plan {
  // ts(2564): ! tells TypeScript TypeORM will assign these at runtime
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  monthlyPrice!: number;

  @Column({ type: 'int', default: 50 })
  invoicesPerMonth!: number; // -1 = unlimited

  @Column({ type: 'int', default: 1 })
  maxUsers!: number; // -1 = unlimited

  @Column({ type: 'int', default: 1 })
  maxCompanies!: number;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'jsonb', nullable: true })
  features!: Record<string, boolean>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}