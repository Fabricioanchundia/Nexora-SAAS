// src/modules/tax-documents/tax-documents.service.ts
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxDocument } from './entities/tax-document.entity';
import {
  TaxDocumentEvent,
  TaxDocumentEventType,
} from './entities/tax-document-event.entity';
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
    @InjectRepository(TaxDocument)
    private readonly taxDocRepo: Repository<TaxDocument>,
    @InjectRepository(TaxDocumentEvent)
    private readonly eventRepo: Repository<TaxDocumentEvent>,
  ) {}

  async findByInvoiceId(invoiceId: string): Promise<TaxDocument | null> {
    return this.taxDocRepo.findOne({
      where: { invoiceId },
      relations: ['events'],
      order: { events: { createdAt: 'ASC' } },
    });
  }

  // Agregar evento al log inmutable — NUNCA falla silenciosamente
  async addEvent(taxDocumentId: string, dto: AddEventDto): Promise<TaxDocumentEvent> {
    try {
      const event = this.eventRepo.create({
        taxDocumentId,
        eventType: dto.eventType,
        sriStatus: dto.sriStatus,
        rawResponse: dto.rawResponse,
        errorDetail: dto.errorDetail,
        metadata: dto.metadata,
      });
      return await this.eventRepo.save(event);
    } catch (error) {
      // Log pero no propagar — perder un evento de auditoría
      // no debe bloquear el flujo principal
      this.logger.error(
        `Error guardando evento ${dto.eventType} para taxDoc ${taxDocumentId}`,
        error.message,
      );
      // Retornar un objeto vacío para no bloquear al caller
      return {} as TaxDocumentEvent;
    }
  }

  async getTimeline(invoiceId: string) {
    const taxDoc = await this.findByInvoiceId(invoiceId);
    if (!taxDoc) throw new NotFoundException('Documento tributario no encontrado');

    return {
      taxDocument: {
        id: taxDoc.id,
        accessKey: taxDoc.accessKey,
        sriStatus: taxDoc.sriStatus,
        authorizationNumber: taxDoc.authorizationNumber,
        authorizedAt: taxDoc.authorizedAt,
        retryCount: taxDoc.retryCount,
        lastError: taxDoc.lastError,
      },
      timeline: taxDoc.events.map((e) => ({
        id: e.id,
        eventType: e.eventType,
        sriStatus: e.sriStatus,
        errorDetail: e.errorDetail,
        createdAt: e.createdAt,
      })),
    };
  }
}