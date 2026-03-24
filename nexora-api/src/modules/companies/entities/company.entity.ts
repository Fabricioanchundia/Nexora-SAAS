import {
  Column, CreateDateColumn, Entity, Index,
  OneToMany, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { EnvironmentType } from '../../../common/enums/environment-type.enum';
import { EmissionType } from '../../../common/enums/emission-type.enum';
import { CompanyUser } from './company-user.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { Product } from '../../products/entities/product.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Certificate } from '../../certificates/entities/certificate.entity';
 
@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Index({ unique: true }) @Column({ length: 13 }) ruc: string;
  @Column({ name: 'business_name', length: 300 }) businessName: string;
  @Column({ name: 'trade_name', length: 300, nullable: true }) tradeName: string;
  @Column({ length: 500 }) address: string;
  @Column({ length: 20, nullable: true }) phone: string;
  @Column({ length: 255, nullable: true }) email: string;
  @Column({ name: 'sri_environment', type: 'enum', enum: EnvironmentType, default: EnvironmentType.PRUEBAS })
  sriEnvironment: EnvironmentType;
  @Column({ name: 'emission_type', type: 'enum', enum: EmissionType, default: EmissionType.NORMAL })
  emissionType: EmissionType;
  @Column({ name: 'establishment_code', length: 3, default: '001' }) establishmentCode: string;
  @Column({ name: 'emission_point', length: 3, default: '001' }) emissionPoint: string;
  @Column({ name: 'next_sequential', default: 1 }) nextSequential: number;
  @Column({ name: 'is_active', default: true }) isActive: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
  @OneToMany(() => CompanyUser, (cu) => cu.company) companyUsers: CompanyUser[];
  @OneToMany(() => Customer, (c) => c.company) customers: Customer[];
  @OneToMany(() => Product, (p) => p.company) products: Product[];
  @OneToMany(() => Invoice, (i) => i.company) invoices: Invoice[];
  @OneToMany(() => Certificate, (c) => c.company) certificates: Certificate[];
}