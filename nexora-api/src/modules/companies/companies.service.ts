import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanyUser, CompanyUserRole } from './entities/company-user.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyUser)
    private readonly companyUserRepo: Repository<CompanyUser>,
  ) {}

  async create(dto: CreateCompanyDto, user: User): Promise<Company> {
    const existing = await this.companyRepo.findOne({
      where: { ruc: dto.ruc },
    });
    if (existing) {
      throw new ConflictException('Ya existe una empresa con este RUC');
    }

    const company = this.companyRepo.create(dto);
    const savedCompany = await this.companyRepo.save(company);

    // El creador queda como OWNER de la empresa
    const companyUser = this.companyUserRepo.create({
      userId: user.id,
      companyId: savedCompany.id,
      role: CompanyUserRole.OWNER,
    });
    await this.companyUserRepo.save(companyUser);

    return savedCompany;
  }

  async findAllForUser(userId: string): Promise<Company[]> {
    const companyUsers = await this.companyUserRepo.find({
      where: { userId, isActive: true },
      relations: ['company'],
    });
    return companyUsers
      .filter((cu) => cu.company.isActive)
      .map((cu) => cu.company);
  }

  async findOne(id: string, userId: string): Promise<Company> {
    const companyUser = await this.companyUserRepo.findOne({
      where: { companyId: id, userId, isActive: true },
      relations: ['company'],
    });

    if (!companyUser || !companyUser.company.isActive) {
      throw new NotFoundException('Empresa no encontrada');
    }

    return companyUser.company;
  }

  // Verifica que el usuario pertenece a la empresa — usado por guards
  async verifyUserBelongsToCompany(
    userId: string,
    companyId: string,
  ): Promise<CompanyUser> {
    const companyUser = await this.companyUserRepo.findOne({
      where: { userId, companyId, isActive: true },
    });

    if (!companyUser) {
      throw new ForbiddenException('No tienes acceso a esta empresa');
    }

    return companyUser;
  }
}