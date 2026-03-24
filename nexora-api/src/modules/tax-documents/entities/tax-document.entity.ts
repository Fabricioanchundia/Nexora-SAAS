import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { TaxDocumentEvent } from './tax-document-event.entity';

@Entity('tax_documents')
export class TaxDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invoice_id' })
  invoiceId: string;

  // Clave de acceso del comprobante (49 dígitos) — copia de invoice.accessKey
  @Column({ name: 'access_key', length: 49 })
  accessKey: string;

  // Rutas en el sistema de almacenamiento
  @Column({ name: 'xml_path', length: 500, nullable: true })
  xmlPath: string; // XML sin firmar

  @Column({ name: 'signed_xml_path', length: 500, nullable: true })
  signedXmlPath: string; // XML firmado

  @Column({ name: 'ride_pdf_path', length: 500, nullable: true })
  ridePdfPath: string; // PDF del RIDE

  @Column({
    name: 'sri_status',
    type: 'enum',
    enum: TaxDocumentStatus,
    default: TaxDocumentStatus.PENDING_SIGN,
  })
  sriStatus: TaxDocumentStatus;

  // Número de autorización devuelto por el SRI (cuando está autorizado)
  @Column({ name: 'authorization_number', length: 49, nullable: true })
  authorizationNumber: string;

  @Column({ name: 'authorized_at', type: 'timestamptz', nullable: true })
  authorizedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date; // primera vez que se envió al SRI

  // Contador de reintentos — nunca superar el máximo definido
  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  // Último error técnico o de negocio registrado
  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string;

  // Respuesta raw del SRI (JSON) para debugging — JSONB para poder hacer queries
  @Column({ name: 'sri_raw_response', type: 'jsonb', nullable: true })
  sriRawResponse: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToOne(() => Invoice, (inv) => inv.taxDocument, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'invoice_id' })
  invoice: Invoice;

  @OneToMany(() => TaxDocumentEvent, (event) => event.taxDocument, {
    cascade: true,
  })
  events: TaxDocumentEvent[];
}