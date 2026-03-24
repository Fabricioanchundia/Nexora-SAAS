import {
  Body, Controller, Delete, Get,
  Param, Post, Put, UseGuards,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyContextGuard } from '../../common/guards/company-context.guard';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Company } from '../companies/entities/company.entity';

@Controller('products')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
export class ProductsController {
  constructor(private readonly svc: ProductsService) {}

  @Post() create(@Body() dto: CreateProductDto, @CurrentCompany() co: Company) {
    return this.svc.create(dto, co.id);
  }

  @Get() findAll(@CurrentCompany() co: Company) {
    return this.svc.findAll(co.id);
  }

  @Get(':id') findOne(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.findOne(id, co.id);
  }

  @Put(':id') update(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @CurrentCompany() co: Company,
  ) {
    return this.svc.update(id, dto, co.id);
  }

  @Delete(':id') remove(@Param('id') id: string, @CurrentCompany() co: Company) {
    return this.svc.remove(id, co.id);
  }
}