import {
    BadRequestException, CanActivate, ExecutionContext,
    ForbiddenException, Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyUser } from '../../modules/companies/entities/company-user.entity';

@Injectable()
export class CompanyContextGuard implements CanActivate {
    constructor(
    @InjectRepository(CompanyUser)
    private readonly cuRepo: Repository<CompanyUser>,
    ) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user;
    const companyId = req.headers['x-company-id'];

    if (!companyId) {
        throw new BadRequestException('El header x-company-id es requerido');
    }

    const cu = await this.cuRepo.findOne({
        where: { userId: user.id, companyId, isActive: true },
        relations: ['company'],
    });

    if (!cu || !cu.company || !cu.company.isActive) {
        throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    req.company = cu.company;
    return true;
    }
}