import {
  Body, Controller, Get, Param,
  Post, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
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

  @Post()
  create(
    @Body() dto: CreateInvoiceDto,
    @CurrentCompany() co: Company,
    @CurrentUser() user: User,
  ) {
    return this.svc.create(dto, co.id, user);
  }

  @Get()
  findAll(
    @CurrentCompany() co: Company,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.svc.findAll(co.id, +page, +limit);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.findOne(id, co.id);
  }

  @Get(':id/timeline')
  getTimeline(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.getTimeline(id, co.id);
  }

  // Reintentar una factura que falló
  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  retry(
    @Param('id') id: string,
    @CurrentCompany() co: Company,
    @CurrentUser() user: User,
  ) {
    return this.svc.retry(id, co.id, user.id);
  }
}