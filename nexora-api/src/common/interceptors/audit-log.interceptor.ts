import {
    CallHandler, ExecutionContext,
    Injectable, NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditLogsService } from '../../modules/audit-logs/audit-logs.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
    constructor(private readonly auditService: AuditLogsService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user, company } = req;

    return next.handle().pipe(
        tap(() => {
        if (user && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
            this.auditService
            .log({
                userId: user?.id,
                companyId: company?.id,
                entityType: url.split('/').filter(Boolean)[1] ?? url,
                action: method,
                metadata: { url, method },
                ipAddress: req.ip,
            })
            .catch(() => {});
        }
        }),
    );
    }
}
