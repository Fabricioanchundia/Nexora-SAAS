import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Customer } from './entities/customer.entity';
import { CustomersService } from './customers.service';
import { CustomersController } from './customers.controller';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [TypeOrmModule.forFeature([Customer]), CompaniesModule],
    controllers: [CustomersController],
    providers: [CustomersService],
    exports: [CustomersService, TypeOrmModule],
})
export class CustomersModule {}