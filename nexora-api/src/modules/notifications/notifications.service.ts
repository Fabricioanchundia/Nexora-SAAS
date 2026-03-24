import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

  // TODO: implementar con nodemailer cuando se configure el servicio de email
    async sendInvoiceToCustomer(
    email: string,
    invoiceNumber: string,
    pdfBuffer: Buffer,
    xmlBuffer: Buffer,
    ): Promise<void> {
    this.logger.log(
        `[PENDIENTE] Enviar factura ${invoiceNumber} a ${email} (${pdfBuffer.length} bytes PDF)`,
    );
    }

    async sendErrorAlert(
    companyEmail: string,
    invoiceId: string,
    error: string,
    ): Promise<void> {
    this.logger.warn(
        `[PENDIENTE] Alerta de error: factura=${invoiceId} → ${companyEmail}: ${error}`,
    );
    }
}
