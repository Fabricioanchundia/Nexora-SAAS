import {
  Column, CreateDateColumn, Entity, JoinColumn,
  OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentEvent } from './tax-document-event.entity';

@Entity('tax_documents')
export class TaxDocument {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'invoice_id' }) invoiceId: string;
  @Column({ name: 'access_key', length: 49 }) accessKey: string;
  @Column({ name: 'xml_path', length: 500, nullable: true }) xmlPath: string;
  @Column({ name: 'signed_xml_path', length: 500, nullable: true }) signedXmlPath: string;
  @Column({ name: 'ride_pdf_path', length: 500, nullable: true }) ridePdfPath: string;
  @Column({
    name: 'sri_status', type: 'enum', enum: TaxDocumentStatus,
    default: TaxDocumentStatus.PENDING_SIGN,
  })
  sriStatus: TaxDocumentStatus;
  @Column({ name: 'authorization_number', length: 49, nullable: true }) authorizationNumber: string;
  @Column({ name: 'authorized_at', type: 'timestamptz', nullable: true }) authorizedAt: Date;
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true }) submittedAt: Date;
  @Column({ name: 'retry_count', default: 0 }) retryCount: number;
  @Column({ name: 'last_error', type: 'text', nullable: true }) lastError: string;
  @Column({ name: 'sri_raw_response', type: 'jsonb', nullable: true })
  sriRawResponse: Record<string, any>;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @OneToOne(() => Invoice, (inv) => inv.taxDocument, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoice_id' }) invoice: Invoice;

  @OneToMany(() => TaxDocumentEvent, (e) => e.taxDocument, { cascade: true })
  events: TaxDocumentEvent[];
}