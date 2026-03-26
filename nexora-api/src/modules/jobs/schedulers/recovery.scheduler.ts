import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { QueueName, JobName } from '../../../common/enums/queue-name.enum';

@Injectable()
export class RecoveryScheduler {
    private readonly logger = new Logger(RecoveryScheduler.name);

    constructor(
    @InjectQueue(QueueName.RECOVERY)
    private readonly recoveryQueue: Queue,
    ) {}

    @Cron(CronExpression.EVERY_10_MINUTES)
    async scheduleRecovery(): Promise<void> {
    // Verificar que no haya ya un job de recovery pendiente
        const waiting = await this.recoveryQueue.getWaiting();
        const active = await this.recoveryQueue.getActive();

    if (waiting.length > 0 || active.length > 0) {
        this.logger.debug('[RECOVERY SCHEDULER] Job ya en cola, omitiendo');
        return;
    }

    await this.recoveryQueue.add(
        JobName.RECOVER_STUCK,
        {},
        {
        jobId: `recovery-${Date.now()}`,
        attempts: 1,
        removeOnComplete: true,
        },
    );

    this.logger.debug('[RECOVERY SCHEDULER] Job de recovery encolado');
    }
}