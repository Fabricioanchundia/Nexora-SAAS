import {
  Injectable, InternalServerErrorException, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TaxDocument } from './entities/tax-document.entity';
import { TaxDocumentEvent, TaxDocumentEventType } from './entities/tax-document-event.entity';
import { SriStatus } from '../../common/enums/tax-document-status.enum';
import { TaxDocStateMachine } from '../../common/states/invoice-state.machine';

export interface AddEventDto {
  eventType: TaxDocumentEventType;
  sriStatus?: SriStatus;
  rawResponse?: Record<string, unknown>;
  errorDetail?: string;
  metadata?: Record<string, unknown>;
}

export interface TransitionDto {
  taxDocumentId: string;
  toStatus: SriStatus;
  updates?: Partial<Pick<TaxDocument,
    | 'xmlPath' | 'signedXmlPath' | 'ridePdfPath'
    | 'authorizationNumber' | 'authorizedAt' | 'submittedAt'
    | 'lastError' | 'sriRawResponse'
  >>;
  event: AddEventDto;
}

@Injectable()
export class TaxDocumentsService {
  private readonly logger = new Logger(TaxDocumentsService.name);

  constructor(
    @InjectRepository(TaxDocument) private readonly repo: Repository<TaxDocument>,
    @InjectRepository(TaxDocumentEvent) private readonly eventRepo: Repository<TaxDocumentEvent>,
    private readonly dataSource: DataSource,
  ) {}

  async transition(dto: TransitionDto): Promise<TaxDocument> {
    const doc = await this.repo.findOne({ where: { id: dto.taxDocumentId } });
    if (!doc) throw new NotFoundException(`TaxDocument ${dto.taxDocumentId} no encontrado`);

    TaxDocStateMachine.assertCanTransition(doc.sriStatus, dto.toStatus);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const updatedDoc = await qr.manager.save(TaxDocument, {
        ...doc, sriStatus: dto.toStatus, ...dto.updates,
      });

      const event        = new TaxDocumentEvent();
      event.taxDocumentId = dto.taxDocumentId;
      event.eventType     = dto.event.eventType;
      event.sriStatus     = dto.toStatus ?? null;
      event.rawResponse   = (dto.event.rawResponse as object) ?? null;
      event.errorDetail   = dto.event.errorDetail ?? null;
      event.metadata      = {
        ...(dto.event.metadata ?? ({} as Record<string, unknown>)),
        fromStatus:       doc.sriStatus,
        toStatus:         dto.toStatus,
        transitionedAt:   new Date().toISOString(),
      };

      await qr.manager.save(TaxDocumentEvent, event);
      await qr.commitTransaction();
      this.logger.log(`TaxDoc ${dto.taxDocumentId}: ${doc.sriStatus} → ${dto.toStatus}`);
      return updatedDoc;
    } catch (err) {
      await qr.rollbackTransaction();
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Transición fallida ${doc.sriStatus} → ${dto.toStatus} taxDoc=${dto.taxDocumentId}: ${message}`);
      throw new InternalServerErrorException(`Error en transición de estado: ${message}`);
    } finally {
      await qr.release();
    }
  }

  async addEvent(taxDocumentId: string, dto: AddEventDto): Promise<TaxDocumentEvent> {
    try {
      const event        = new TaxDocumentEvent();
      event.taxDocumentId = taxDocumentId;
      event.eventType     = dto.eventType;
      event.sriStatus     = dto.sriStatus ?? null;
      event.rawResponse   = (dto.rawResponse as object) ?? null;
      event.errorDetail   = dto.errorDetail ?? null;
      event.metadata      = (dto.metadata as object) ?? null;
      return await this.eventRepo.save(event);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`CRÍTICO: Error guardando evento ${dto.eventType} taxDoc=${taxDocumentId}: ${message}`);
      throw new InternalServerErrorException(`Error de trazabilidad: no se pudo guardar evento ${dto.eventType}`);
    }
  }

  async addEventSafe(taxDocumentId: string, dto: AddEventDto): Promise<TaxDocumentEvent | null> {
    try {
      const event        = new TaxDocumentEvent();
      event.taxDocumentId = taxDocumentId;
      event.eventType     = dto.eventType;
      event.sriStatus     = dto.sriStatus ?? null;
      event.rawResponse   = (dto.rawResponse as object) ?? null;
      event.errorDetail   = dto.errorDetail ?? null;
      event.metadata      = (dto.metadata as object) ?? null;
      return await this.eventRepo.save(event);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Evento no crítico perdido (${dto.eventType}) taxDoc=${taxDocumentId}: ${message}`);
      return null;
    }
  }

  async incrementSriRetry(taxDocumentId: string, errorMessage: string): Promise<void> {
    await this.repo.createQueryBuilder().update(TaxDocument)
      .set({ sriRetryCount: () => 'sri_retry_count + 1', lastError: errorMessage })
      .where('id = :id', { id: taxDocumentId })
      .execute();
  }

  async findByInvoiceId(invoiceId: string): Promise<TaxDocument | null> {
    return this.repo.findOne({ where: { invoiceId }, relations: ['events'], order: { events: { createdAt: 'ASC' } } });
  }

  async findById(id: string): Promise<TaxDocument | null> {
    return this.repo.findOne({ where: { id }, relations: ['events'] });
  }

  async getTimeline(invoiceId: string) {
    const doc = await this.findByInvoiceId(invoiceId);
    if (!doc) throw new NotFoundException('Documento tributario no encontrado');
    return {
      id: doc.id, accessKey: doc.accessKey, environment: doc.environment,
      sriStatus: doc.sriStatus, authorizationNumber: doc.authorizationNumber,
      authorizedAt: doc.authorizedAt, submittedAt: doc.submittedAt,
      sriRetryCount: doc.sriRetryCount, lastError: doc.lastError,
      xmlPath: doc.xmlPath, signedXmlPath: doc.signedXmlPath, ridePdfPath: doc.ridePdfPath,
      createdAt: doc.createdAt, updatedAt: doc.updatedAt,
      events: [...doc.events]
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
        .map((e) => ({ id: e.id, eventType: e.eventType, sriStatus: e.sriStatus, errorDetail: e.errorDetail, metadata: e.metadata, createdAt: e.createdAt })),
    };
  }

  async findStuck(olderThanMinutes: number): Promise<TaxDocument[]> {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - olderThanMinutes);
    return this.repo.createQueryBuilder('td')
      .where('td.sri_status IN (:...statuses)', {
        statuses: [SriStatus.PENDING_SIGN, SriStatus.SIGNED, SriStatus.SUBMITTED, SriStatus.RECEIVED, SriStatus.IN_PROCESS],
      })
      .andWhere('td.updated_at < :cutoff', { cutoff })
      .andWhere('td.sri_retry_count < :maxRetries', { maxRetries: 5 })
      .orderBy('td.updated_at', 'ASC')
      .getMany();
  }
}
