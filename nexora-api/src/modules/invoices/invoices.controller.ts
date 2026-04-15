import {
  Body, Controller, Get, Param, Post,
  Query, UseGuards, HttpCode, HttpStatus, Res, StreamableFile,
} from '@nestjs/common';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyContextGuard } from '../../common/guards/company-context.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { User } from '../users/entities/user.entity';
import { Company } from '../companies/entities/company.entity';

@Controller('invoices')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  // ─── Crear y emitir factura ────────────────────────────────────────────────
  @Post()
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentCompany() co: Company,
    @CurrentUser() user: User,
  ) {
    return this.svc.create(dto, co.id, user);
  }

  // ─── Listar facturas ───────────────────────────────────────────────────────
  @Get()
  findAll(
    @CurrentCompany() co: Company,
    @Query('page')   page  = 1,
    @Query('limit')  limit = 20,
    @Query('status') status?: string,
  ) {
    return this.svc.findAll(co.id, +page, +limit, status);
  }

  // ─── Ver factura ──────────────────────────────────────────────────────────
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.findOne(id, co.id);
  }

  // ─── Timeline / historial de estados ─────────────────────────────────────
  @Get(':id/timeline')
  getTimeline(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.getTimeline(id, co.id);
  }

  // ─── Descargar PDF (RIDE) ─────────────────────────────────────────────────
  @Get(':id/pdf')
  async downloadPdf(
    @Param('id') id: string,
    @CurrentCompany() co: Company,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.svc.downloadPdf(id, co.id);
    res.set({
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  // ─── Descargar XML firmado ────────────────────────────────────────────────
  @Get(':id/xml')
  async downloadXml(
    @Param('id') id: string,
    @CurrentCompany() co: Company,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const { buffer, filename } = await this.svc.downloadXml(id, co.id);
    res.set({
      'Content-Type':        'application/xml',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    return new StreamableFile(buffer);
  }

  // ─── Reintentar factura fallida ───────────────────────────────────────────
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  retry(
    @Param('id') id: string,
    @CurrentCompany() co: Company,
    @CurrentUser() user: User,
  ) {
    return this.svc.retry(id, co.id, user.id);
  }

  // ─── Cancelar factura (DRAFT) ─────────────────────────────────────────────
  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id') id: string,
    @CurrentCompany() co: Company,
    @CurrentUser() user: User,
  ) {
    return this.svc.cancel(id, co.id, user.id);
  }
}
