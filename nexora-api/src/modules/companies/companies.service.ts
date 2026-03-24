import {
  ConflictException, ForbiddenException,
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity';
import { CompanyUser, CompanyUserRole } from './entities/company-user.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(CompanyUser) private readonly cuRepo: Repository<CompanyUser>,
  ) {}

  async create(dto: CreateCompanyDto, user: User): Promise<Company> {
    const existing = await this.companyRepo.findOne({ where: { ruc: dto.ruc } });
    if (existing) throw new ConflictException('Ya existe una empresa con este RUC');
    const company = await this.companyRepo.save(this.companyRepo.create(dto));
    await this.cuRepo.save(
      this.cuRepo.create({ userId: user.id, companyId: company.id, role: CompanyUserRole.OWNER }),
    );
    return company;
  }

  async findAllForUser(userId: string): Promise<Company[]> {
    const cus = await this.cuRepo.find({
      where: { userId, isActive: true },
      relations: ['company'],
    });
    return cus
      .filter((cu) => cu.company?.isActive)
      .map((cu) => cu.company as Company);
  }

  async findOne(id: string, userId: string): Promise<Company> {
    const cu = await this.cuRepo.findOne({
      where: { companyId: id, userId, isActive: true },
      relations: ['company'],
    });
    if (!cu || !cu.company?.isActive) throw new NotFoundException('Empresa no encontrada');
    return cu.company as Company;
  }

  async update(id: string, dto: UpdateCompanyDto, userId: string): Promise<Company> {
    await this.findOne(id, userId);
    await this.companyRepo.update(id, dto as any);
    const company = await this.companyRepo.findOne({ where: { id } });
    if (!company) throw new NotFoundException('Empresa no encontrada');
    return company;
  }

  async verifyAccess(userId: string, companyId: string): Promise<CompanyUser> {
    const cu = await this.cuRepo.findOne({
      where: { userId, companyId, isActive: true },
    });
    if (!cu) throw new ForbiddenException('No tienes acceso a esta empresa');
    return cu;
  }
}