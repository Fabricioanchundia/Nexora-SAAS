import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'company_id', nullable: true })
  companyId: string; // null para acciones de sistema sin empresa

  @Index()
  @Column({ name: 'user_id', nullable: true })
  userId: string;

  @Column({ name: 'entity_type', length: 100 })
  entityType: string; // 'Invoice', 'Customer', 'Certificate', etc.

  @Column({ name: 'entity_id', nullable: true })
  entityId: string;

  @Column({ length: 100 })
  action: string; // 'CREATE', 'UPDATE', 'DELETE', 'DOWNLOAD', 'LOGIN', etc.

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>; // cambios, valores anteriores, IP, etc.

  @Column({ name: 'ip_address', length: 45, nullable: true })
  ipAddress: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}