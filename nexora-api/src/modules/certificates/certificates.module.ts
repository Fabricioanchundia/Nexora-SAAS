import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { Certificate } from './entities/certificate.entity';
import { CertificatesService } from './certificates.service';
import { CertificatesController } from './certificates.controller';
import { StorageModule } from '../storage/storage.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
    imports: [
    TypeOrmModule.forFeature([Certificate]),
    MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } }),
    StorageModule,
    CompaniesModule,
    ],
    controllers: [CertificatesController],
    providers: [CertificatesService],
    exports: [CertificatesService, TypeOrmModule],
})
export class CertificatesModule {}