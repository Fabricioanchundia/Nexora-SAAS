import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import storageConfig from './config/storage.config';

import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TaxDocumentsModule } from './modules/tax-documents/tax-documents.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { StorageModule } from './modules/storage/storage.module';
import { JobsModule } from './modules/jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, storageConfig],
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
          password: configService.get('redis.password') || undefined,
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    CompaniesModule,
    CustomersModule,
    ProductsModule,
    InvoicesModule,
    TaxDocumentsModule,
    CertificatesModule,
    AuditLogsModule,
    StorageModule,
    JobsModule,
  ],
})
export class AppModule {}