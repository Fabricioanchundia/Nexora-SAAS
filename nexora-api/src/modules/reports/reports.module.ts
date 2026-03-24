import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from '../invoices/entities/invoice.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [TypeOrmModule.forFeature([Invoice]), CompaniesModule],
    controllers: [ReportsController],
    providers: [ReportsService],
})
export class ReportsModule {}
