import { Module } from '@nestjs/common';
import { XmlGenerationService } from './xml-generation.service';

@Module({
  providers: [XmlGenerationService],
  exports: [XmlGenerationService],
})
export class XmlGenerationModule {}