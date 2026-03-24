import {
  Column, CreateDateColumn, Entity, Index,
  JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { IdentificationType } from '../../../common/enums/identification-type.enum';
import { Company } from '../../companies/entities/company.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'company_id' }) companyId: string;
  @Column({ name: 'identification_type', type: 'enum', enum: IdentificationType })
  identificationType: IdentificationType;
  @Index() @Column({ length: 20 }) identification: string;
  @Column({ name: 'full_name', length: 300 }) fullName: string;
  @Column({ length: 255, nullable: true }) email: string;
  @Column({ length: 20, nullable: true }) phone: string;
  @Column({ length: 500, nullable: true }) address: string;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @ManyToOne(() => Company, (c) => c.customers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' }) company: Company;
}