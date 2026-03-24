import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SriIntegrationService } from './sri-integration.service';

@Module({
  imports: [HttpModule],
  providers: [SriIntegrationService],
  exports: [SriIntegrationService],
})
export class SriIntegrationModule {}