import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Company } from '../../modules/companies/entities/company.entity';

export const CurrentCompany = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Company => {
    const request = ctx.switchToHttp().getRequest();
    return request.company; // inyectado por el CompanyContextGuard
  },
);