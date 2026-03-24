import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CompanyUser } from './entities/company-user.entity';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Company, CompanyUser])],
    controllers: [CompaniesController],
    providers: [CompaniesService],
    exports: [CompaniesService, TypeOrmModule],
})
export class CompaniesModule {}