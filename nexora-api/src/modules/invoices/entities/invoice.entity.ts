import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { Company } from '../../companies/entities/company.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { InvoiceItem } from './invoice-item.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'user_id' }) // quién la creó
  userId: string;

  // Número secuencial en formato SRI: 001-001-000000001
  // PENDIENTE DE PARAMETRIZACIÓN — formato según ficha técnica SRI
  @Index()
  @Column({ length: 17, nullable: true })
  sequential: string;

  // Clave de acceso de 49 dígitos generada según algoritmo SRI
  // PENDIENTE DE PARAMETRIZACIÓN
  @Index({ unique: true })
  @Column({ name: 'access_key', length: 49, nullable: true })
  accessKey: string;

  @Column({ name: 'issue_date', type: 'date' })
  issueDate: Date;

  // Todos los valores monetarios en decimal con 2 decimales para totales
  // y 4 para cálculos intermedios — consistente con normativa SRI
  @Column({
    name: 'subtotal_no_tax',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  subtotalNoTax: number; // bienes/servicios con tarifa 0 o exentos

  @Column({
    name: 'subtotal_taxable',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  subtotalTaxable: number; // base imponible (aplica IVA)

  @Column({
    name: 'discount_total',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  discountTotal: number;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  taxAmount: number; // valor del IVA calculado

  @Column({ name: 'total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  total: number;

  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
  })
  status: InvoiceStatus;

  // Notas internas, no aparecen en el comprobante
  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.invoices, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @OneToOne(() => TaxDocument, (td) => td.invoice)
  taxDocument: TaxDocument;
}