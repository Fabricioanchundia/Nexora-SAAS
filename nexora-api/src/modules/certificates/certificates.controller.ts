/// <reference types="multer" />
import {
    Controller, Get, Post, UploadedFile,
    UseGuards, UseInterceptors, Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CertificatesService } from './certificates.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CompanyContextGuard } from '../../common/guards/company-context.guard';
import { CurrentCompany } from '../../common/decorators/current-company.decorator';
import { Company } from '../companies/entities/company.entity';
import { UploadCertificateDto } from './dto/upload-certificate.dto';

@Controller('certificates')
@UseGuards(JwtAuthGuard, CompanyContextGuard)
export class CertificatesController {
    constructor(private readonly svc: CertificatesService) {}

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadCertificateDto,
    @CurrentCompany() co: Company,
    ) {
    return this.svc.upload(co.id, file.buffer, dto.passphrase);
    }

    @Get()
    findAll(@CurrentCompany() co: Company) {
    return this.svc.findAll(co.id);
    }

    @Get('active')
    getActive(@CurrentCompany() co: Company) {
    return this.svc.getActive(co.id);
    }
}