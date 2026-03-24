import {
  Column, CreateDateColumn, Entity, Index,
  JoinColumn, ManyToOne, OneToMany,
  OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { Company } from '../../companies/entities/company.entity';
import { Customer } from '../../customers/entities/customer.entity';
import { User } from '../../users/entities/user.entity';
import { InvoiceItem } from './invoice-item.entity';
import { TaxDocument } from '../../tax-documents/entities/tax-document.entity';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'company_id' }) companyId: string;
  @Column({ name: 'customer_id' }) customerId: string;
  @Column({ name: 'user_id' }) userId: string;
  @Index() @Column({ length: 17, nullable: true }) sequential: string;
  @Index({ unique: true })
  @Column({ name: 'access_key', length: 49, nullable: true }) accessKey: string;
  @Column({ name: 'issue_date', type: 'date' }) issueDate: Date;
  @Column({ name: 'subtotal_no_tax', type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotalNoTax: number;
  @Column({ name: 'subtotal_taxable', type: 'decimal', precision: 14, scale: 2, default: 0 })
  subtotalTaxable: number;
  @Column({ name: 'discount_total', type: 'decimal', precision: 14, scale: 2, default: 0 })
  discountTotal: number;
  @Column({ name: 'tax_amount', type: 'decimal', precision: 14, scale: 2, default: 0 })
  taxAmount: number;
  @Column({ type: 'decimal', precision: 14, scale: 2, default: 0 }) total: number;
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT }) status: InvoiceStatus;
  @Column({ type: 'text', nullable: true }) notes: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' }) company: Company;

  @ManyToOne(() => Customer, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' }) customer: Customer;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' }) user: User;

  @OneToMany(() => InvoiceItem, (item) => item.invoice, { cascade: true })
  items: InvoiceItem[];

  @OneToOne(() => TaxDocument, (td) => td.invoice)
  taxDocument: TaxDocument;
}