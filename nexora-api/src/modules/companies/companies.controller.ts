import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';

@Controller('companies')
@UseGuards(JwtAuthGuard)
export class CompaniesController {
    constructor(private readonly svc: CompaniesService) {}

    @Post()
    create(@Body() dto: CreateCompanyDto, @CurrentUser() user: User) {
    return this.svc.create(dto, user);
    }

    @Get()
    findAll(@CurrentUser() user: User) {
    return this.svc.findAllForUser(user.id);
    }

    @Get(':id')
    findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.svc.findOne(id, user.id);
    }

    @Put(':id')
    update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() user: User) {
    return this.svc.update(id, dto, user.id);
    }
}