// src/modules/tax-documents/entities/tax-document.entity.ts
import {
  Column, CreateDateColumn, Entity, JoinColumn,
  OneToMany, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { SriStatus, PostStatus } from '../../../common/enums/tax-document-status.enum';
import { EnvironmentType } from '../../../common/enums/environment-type.enum';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentEvent } from './tax-document-event.entity';

@Entity('tax_documents')
export class TaxDocument {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'invoice_id' }) invoiceId: string;
  @Column({ name: 'access_key', length: 49 }) accessKey: string;
  @Column({ name: 'xml_path', length: 500, nullable: true }) xmlPath: string | null;
  @Column({ name: 'signed_xml_path', length: 500, nullable: true }) signedXmlPath: string | null;
  @Column({ name: 'ride_pdf_path', length: 500, nullable: true }) ridePdfPath: string | null;

  @Column({ name: 'sri_status', type: 'enum', enum: SriStatus, default: SriStatus.PENDING_SIGN })
  sriStatus: SriStatus;

  @Column({ name: 'post_status', type: 'enum', enum: PostStatus, nullable: true })
  postStatus: PostStatus | null;

  @Column({ name: 'environment', type: 'enum', enum: EnvironmentType, nullable: true })
  environment: EnvironmentType | null;

  @Column({ name: 'authorization_number', length: 49, nullable: true })
  authorizationNumber: string | null;

  @Column({ name: 'authorized_at', type: 'timestamptz', nullable: true })
  authorizedAt: Date | null;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date | null;

  @Column({ name: 'sri_retry_count', default: 0 })
  sriRetryCount: number;

  @Column({ name: 'post_retry_count', default: 0 })
  postRetryCount: number;

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ name: 'sri_raw_response', type: 'jsonb', nullable: true })
  sriRawResponse: object | null;

  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;

  @OneToOne(() => Invoice, (inv) => inv.taxDocument, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoice_id' }) invoice: Invoice;

  @OneToMany(() => TaxDocumentEvent, (e) => e.taxDocument, { cascade: true })
  events: TaxDocumentEvent[];
}
