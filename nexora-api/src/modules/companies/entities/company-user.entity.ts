import {
  Column, CreateDateColumn, Entity,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Company } from './company.entity';
 
export enum CompanyUserRole {
  OWNER = 'OWNER',
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
}
 
@Entity('company_users')
@Unique(['userId', 'companyId'])
export class CompanyUser {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'company_id' }) companyId: string;
  @Column({ type: 'enum', enum: CompanyUserRole, default: CompanyUserRole.OPERATOR }) role: CompanyUserRole;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @ManyToOne(() => User, (u) => u.companyUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' }) user: User;
  @ManyToOne(() => Company, (c) => c.companyUsers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' }) company: Company;
}