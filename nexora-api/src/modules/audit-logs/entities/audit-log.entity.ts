import {
  Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index() @Column({ name: 'company_id', nullable: true }) companyId: string;
  @Index() @Column({ name: 'user_id', nullable: true }) userId: string;
  @Column({ name: 'entity_type', length: 100 }) entityType: string;
  @Column({ name: 'entity_id', nullable: true }) entityId: string;
  @Column({ length: 100 }) action: string;
  @Column({ type: 'jsonb', nullable: true }) metadata: Record<string, any>;
  @Column({ name: 'ip_address', length: 45, nullable: true }) ipAddress: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}