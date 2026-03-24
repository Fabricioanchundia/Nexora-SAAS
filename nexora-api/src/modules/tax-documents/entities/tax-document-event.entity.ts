import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { TaxDocumentStatus } from '../../../common/enums/tax-document-status.enum';
import { TaxDocument } from './tax-document.entity';

export enum TaxDocumentEventType {
  CREATED = 'CREATED',
  SIGN_STARTED = 'SIGN_STARTED',
  SIGN_COMPLETED = 'SIGN_COMPLETED',
  SIGN_FAILED = 'SIGN_FAILED',
  SUBMISSION_STARTED = 'SUBMISSION_STARTED',
  SUBMISSION_COMPLETED = 'SUBMISSION_COMPLETED',
  SUBMISSION_FAILED = 'SUBMISSION_FAILED',
  STATUS_CHECKED = 'STATUS_CHECKED',
  AUTHORIZED = 'AUTHORIZED',
  REJECTED = 'REJECTED',
  RETRY_SCHEDULED = 'RETRY_SCHEDULED',
  RIDE_GENERATED = 'RIDE_GENERATED',
  RIDE_FAILED = 'RIDE_FAILED',
  NOTIFICATION_SENT = 'NOTIFICATION_SENT',
}

// Esta tabla es un log INMUTABLE. Nunca se editan registros, solo se agregan.
@Entity('tax_document_events')
export class TaxDocumentEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tax_document_id' })
  taxDocumentId: string;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: TaxDocumentEventType,
  })
  eventType: TaxDocumentEventType;

  @Column({
    name: 'sri_status',
    type: 'enum',
    enum: TaxDocumentStatus,
    nullable: true,
  })
  sriStatus: TaxDocumentStatus; // estado del SRI en este momento

  // Respuesta raw del SRI o detalle del error
  @Column({ name: 'raw_response', type: 'jsonb', nullable: true })
  rawResponse: Record<string, any>;

  @Column({ name: 'error_detail', type: 'text', nullable: true })
  errorDetail: string;

  // Metadatos adicionales (job id, worker, retry number, etc.)
  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date; // immutable — no hay updatedAt aquí

  @ManyToOne(() => TaxDocument, (td) => td.events, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'tax_document_id' })
  taxDocument: TaxDocument;
}