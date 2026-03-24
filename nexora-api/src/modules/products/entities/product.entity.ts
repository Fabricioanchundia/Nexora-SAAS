import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaxCode, IvaRate } from '../../../common/enums/tax-code.enum';
import { Company } from '../../companies/entities/company.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  // Código interno del producto (usado en el XML del comprobante)
  @Column({ length: 100 })
  code: string;

  @Column({ length: 300 })
  name: string;

  @Column({ length: 1000, nullable: true })
  description: string;

  // CRÍTICO: usar decimal con precisión adecuada para dinero
  // Nunca float para precios
  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 4 })
  unitPrice: number;

  // Código de tarifa de IVA — PENDIENTE DE PARAMETRIZACIÓN con ficha técnica SRI
  @Column({
    name: 'iva_rate',
    type: 'enum',
    enum: IvaRate,
    default: IvaRate.DOCE,
  })
  ivaRate: IvaRate;

  @Column({
    name: 'tax_code',
    type: 'enum',
    enum: TaxCode,
    default: TaxCode.IVA,
  })
  taxCode: TaxCode;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.products, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;
}