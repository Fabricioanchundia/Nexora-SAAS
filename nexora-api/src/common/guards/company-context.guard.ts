import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { CompaniesService } from '../../modules/companies/companies.service';

// Este guard:
// 1. Lee el header 'x-company-id'
// 2. Verifica que el usuario tiene acceso a esa empresa
// 3. Inyecta la empresa en request.company
// Usar junto con JwtAuthGuard en rutas que requieren contexto de empresa

@Injectable()
export class CompanyContextGuard implements CanActivate {
  constructor(private readonly companiesService: CompaniesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const companyId = request.headers['x-company-id'];

    if (!companyId) {
      throw new BadRequestException(
        'Header x-company-id es requerido para esta operación',
      );
    }

    const company = await this.companiesService.findOne(
      companyId,
      user.id,
    );

    request.company = company;
    return true;
  }
}