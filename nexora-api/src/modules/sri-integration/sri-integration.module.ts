import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SriIntegrationService } from './sri-integration.service';
import * as https from 'https';

@Module({
  imports: [
    HttpModule.register({
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      timeout: 60000,
    }),
  ],
  providers: [SriIntegrationService],
  exports: [SriIntegrationService],
})
export class SriIntegrationModule {}