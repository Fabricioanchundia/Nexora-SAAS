import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyContextGuard } from '../../common/guards/company-context.guard';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Company } from '../companies/entities/company.entity';

@Controller('reports')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
export class ReportsController {
    constructor(private readonly svc: ReportsService) {}

    @Get('dashboard')
    getDashboard(@CurrentCompany() co: Company) {
    return this.svc.getDashboard(co.id);
    }

    @Get('sales')
    getSales(
    @CurrentCompany() co: Company,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    ) {
    return this.svc.getSalesReport(co.id, dateFrom, dateTo);
    }
}