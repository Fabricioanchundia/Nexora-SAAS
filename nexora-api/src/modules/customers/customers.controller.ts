import {
    Body, Controller, Delete, Get,
    Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyContextGuard } from '../../common/guards/company-context.guard';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Company } from '../companies/entities/company.entity';

@Controller('customers')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
export class CustomersController {
    constructor(private readonly svc: CustomersService) {}

    @Post() create(@Body() dto: CreateCustomerDto, @CurrentCompany() co: Company) {
    return this.svc.create(dto, co.id);
    }

    @Get() findAll(@CurrentCompany() co: Company, @Query('search') search?: string) {
    return this.svc.findAll(co.id, search);
    }

    @Get(':id') findOne(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.findOne(id, co.id);
    }

    @Put(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
    @CurrentCompany() co: Company,
    ) {
    return this.svc.update(id, dto, co.id);
    }

    @Delete(':id') remove(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.remove(id, co.id);
    }
}