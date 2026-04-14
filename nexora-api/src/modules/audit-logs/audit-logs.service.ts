import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

interface LogDto {
  companyId?: string;
  userId?: string;
  entityType: string;
  entityId?: string;
  action: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    @InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>,
  ) {}

  async log(dto: LogDto): Promise<void> {
    try {
      await this.repo.save(this.repo.create(dto));
    } catch (err) {
      this.logger.error('Error guardando audit log', err instanceof Error ? err.message : String(err));
    }
  }

  findAll(companyId: string, page = 1, limit = 50) {
    return this.repo.findAndCount({
      where: { companyId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
  }
}
