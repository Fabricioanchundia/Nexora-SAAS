import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import storageConfig from './config/storage.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ProductsModule } from './modules/products/products.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { TaxDocumentsModule } from './modules/tax-documents/tax-documents.module';
import { XmlGenerationModule } from './modules/xml-generation/xml-generation.module';
import { SigningModule } from './modules/signing/signing.module';
import { SriIntegrationModule } from './modules/sri-integration/sri-integration.module';
import { RideModule } from './modules/ride/ride.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StorageModule } from './modules/storage/storage.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, jwtConfig, redisConfig, storageConfig],
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get<string>('database.host'),
        port: cfg.get<number>('database.port'),
        database: cfg.get<string>('database.name'),
        username: cfg.get<string>('database.user'),
        password: cfg.get<string>('database.password'),
        ssl: cfg.get<boolean>('database.ssl'),
        logging: cfg.get<boolean>('database.logging'),
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        // ⚠️ synchronize: true solo para desarrollo — en producción usar migraciones
        synchronize: cfg.get<string>('app.nodeEnv') !== 'production',
        autoLoadEntities: true,
      }),
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        redis: {
          host: cfg.get<string>('redis.host'),
          port: cfg.get<number>('redis.port'),
          password: cfg.get<string>('redis.password') || undefined,
        },
      }),
    }),

    AuthModule,
    UsersModule,
    CompaniesModule,
    CertificatesModule,
    CustomersModule,
    ProductsModule,
    InvoicesModule,
    TaxDocumentsModule,
    XmlGenerationModule,
    SigningModule,
    SriIntegrationModule,
    RideModule,
    NotificationsModule,
    ReportsModule,
    StorageModule,
    JobsModule,
    AuditLogsModule,
  ],
})
export class AppModule {}