import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxDocument } from './entities/tax-document.entity';
import { TaxDocumentEvent, TaxDocumentEventType } from './entities/tax-document-event.entity';
import { TaxDocumentStatus } from '../../common/enums/tax-document-status.enum';

interface AddEventDto {
  eventType: TaxDocumentEventType;
  sriStatus?: TaxDocumentStatus;
  rawResponse?: Record<string, any>;
  errorDetail?: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class TaxDocumentsService {
  private readonly logger = new Logger(TaxDocumentsService.name);

  constructor(
    @InjectRepository(TaxDocument) private readonly repo: Repository<TaxDocument>,
    @InjectRepository(TaxDocumentEvent) private readonly eventRepo: Repository<TaxDocumentEvent>,
  ) {}

  async findByInvoiceId(invoiceId: string): Promise<TaxDocument | null> {
    return this.repo.findOne({
      where: { invoiceId },
      relations: ['events'],
      order: { events: { createdAt: 'ASC' } },
    });
  }

  async getTimeline(invoiceId: string) {
    const doc = await this.findByInvoiceId(invoiceId);
    if (!doc) throw new NotFoundException('Documento tributario no encontrado');
    return {
      taxDocument: {
        id: doc.id,
        accessKey: doc.accessKey,
        sriStatus: doc.sriStatus,
        authorizationNumber: doc.authorizationNumber,
        authorizedAt: doc.authorizedAt,
        retryCount: doc.retryCount,
        lastError: doc.lastError,
      },
      timeline: doc.events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        sriStatus: e.sriStatus,
        errorDetail: e.errorDetail,
        createdAt: e.createdAt,
      })),
    };
  }

  async addEvent(taxDocumentId: string, dto: AddEventDto): Promise<TaxDocumentEvent> {
    try {
      const event = this.eventRepo.create({ taxDocumentId, ...dto });
      return await this.eventRepo.save(event);
    } catch (err) {
      this.logger.error(
        `Error guardando evento ${dto.eventType} taxDoc=${taxDocumentId}`,
        err.message,
      );
      return {} as TaxDocumentEvent;
    }
  }
}