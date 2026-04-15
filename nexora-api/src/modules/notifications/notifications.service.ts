import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class NotificationsService {
  private readonly logger    = new Logger(NotificationsService.name);
  private readonly transporter: Transporter | null;
  private readonly fromEmail: string;
  private readonly fromName:  string;

  constructor(private readonly cfg: ConfigService) {
    const host = this.cfg.get<string>('SMTP_HOST');
    const user = this.cfg.get<string>('SMTP_USER');
    const pass = this.cfg.get<string>('SMTP_PASS');

    this.fromEmail = this.cfg.get<string>('SMTP_FROM_EMAIL') ?? user ?? 'no-reply@nexora.ec';
    this.fromName  = this.cfg.get<string>('SMTP_FROM_NAME')  ?? 'Nexora Facturación';

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port:   Number(this.cfg.get<string>('SMTP_PORT') ?? '587'),
        secure: this.cfg.get<string>('SMTP_SECURE') === 'true',
        auth:   { user, pass },
      });
      this.logger.log(`Servicio de email configurado: ${host}`);
    } else {
      this.transporter = null;
      this.logger.warn('SMTP no configurado — emails deshabilitados. Configura SMTP_HOST, SMTP_USER, SMTP_PASS en .env');
    }
  }

  async sendInvoiceToCustomer(
    email: string,
    invoiceNumber: string,
    pdfBuffer: Buffer,
    xmlBuffer: Buffer,
  ): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[EMAIL DESHABILITADO] Factura ${invoiceNumber} para ${email} no enviada`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from:    `"${this.fromName}" <${this.fromEmail}>`,
        to:      email,
        subject: `Factura Electrónica ${invoiceNumber} - Nexora`,
        html:    this.buildInvoiceEmail(invoiceNumber),
        attachments: [
          {
            filename:    `factura-${invoiceNumber}.pdf`,
            content:     pdfBuffer,
            contentType: 'application/pdf',
          },
          {
            filename:    `factura-${invoiceNumber}.xml`,
            content:     xmlBuffer,
            contentType: 'application/xml',
          },
        ],
      });
      this.logger.log(`Email enviado: factura=${invoiceNumber} → ${email}`);
    } catch (err) {
      this.logger.error(
        `Error enviando email factura=${invoiceNumber} → ${email}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // No lanzar — email fallido no debe bloquear el flujo de autorización
    }
  }

  async sendErrorAlert(companyEmail: string, invoiceId: string, error: string): Promise<void> {
    if (!this.transporter) return;
    try {
      await this.transporter.sendMail({
        from:    `"${this.fromName}" <${this.fromEmail}>`,
        to:      companyEmail,
        subject: `⚠️ Error en factura ${invoiceId} - Nexora`,
        html:    `<p>Se produjo un error procesando la factura <strong>${invoiceId}</strong>:</p><pre>${error}</pre>`,
      });
    } catch (err) {
      this.logger.warn(`Error enviando alerta: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private buildInvoiceEmail(invoiceNumber: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1a56db; padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Nexora</h1>
          <p style="color: #bfdbfe; margin: 4px 0 0;">Facturación Electrónica</p>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">Su factura electrónica está lista</h2>
          <p style="color: #6b7280;">Estimado cliente, adjuntamos su comprobante electrónico <strong>${invoiceNumber}</strong> autorizado por el SRI.</p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; margin: 16px 0;">
            <p style="color: #166534; margin: 0;">✅ Factura autorizada por el Servicio de Rentas Internas del Ecuador</p>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Encontrará adjuntos en este correo:</p>
          <ul style="color: #6b7280; font-size: 13px;">
            <li>📄 Factura en PDF (RIDE)</li>
            <li>📋 Comprobante electrónico XML</li>
          </ul>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">Nexora Facturación Electrónica — Ecuador</p>
        </div>
      </body>
      </html>
    `;
  }
}
