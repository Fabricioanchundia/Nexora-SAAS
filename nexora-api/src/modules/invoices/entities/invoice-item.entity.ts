import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TaxCode, IvaRate } from '../../../common/enums/tax-code.enum';
import { Invoice } from './invoice.entity';

@Entity('invoice_items')
export class InvoiceItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  @Column({ name: 'product_id', nullable: true })
  productId: string | null;

  @Column({ name: 'product_code', length: 100 })
  productCode: string;

  // Código auxiliar del producto — opcional en XML SRI (codigoAuxiliar)
  @Column({ name: 'auxiliary_code', length: 100, nullable: true })
  auxiliaryCode: string | null;

  @Column({ length: 300 })
  description: string;

  @Column({ type: 'decimal', precision: 12, scale: 6 })
  quantity: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 12, scale: 6 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'decimal', precision: 14, scale: 2 })
  subtotal: number;

  @Column({ name: 'iva_rate', type: 'enum', enum: IvaRate })
  ivaRate: IvaRate;

  @Column({
    name: 'tax_code',
    type: 'enum',
    enum: TaxCode,
    default: TaxCode.IVA,
  })
  taxCode: TaxCode;

  @Column({
    name: 'tax_amount',
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
  })
  taxAmount: number;

  @ManyToOne(() => Invoice, (inv) => inv.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;
}