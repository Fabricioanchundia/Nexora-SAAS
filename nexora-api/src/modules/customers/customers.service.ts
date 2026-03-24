import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Customer } from './entities/customer.entity';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(
    @InjectRepository(Customer) private readonly repo: Repository<Customer>,
    ) {}

    create(dto: CreateCustomerDto, companyId: string) {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
    }

    findAll(companyId: string, search?: string) {
    if (search) {
        return this.repo.find({
        where: [
            { companyId, isActive: true, fullName: Like(`%${search}%`) },
            { companyId, isActive: true, identification: Like(`%${search}%`) },
        ],
        order: { fullName: 'ASC' },
        });
    }
    return this.repo.find({
        where: { companyId, isActive: true },
        order: { fullName: 'ASC' },
    });
    }

    async findOne(id: string, companyId: string): Promise<Customer> {
    const c = await this.repo.findOne({ where: { id, companyId } });
    if (!c) throw new NotFoundException('Cliente no encontrado');
    return c;
    }

    async update(id: string, dto: UpdateCustomerDto, companyId: string): Promise<Customer> {
    await this.findOne(id, companyId);
    await this.repo.update({ id, companyId }, dto as any);
    return this.findOne(id, companyId);
    }

    async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.repo.update({ id, companyId }, { isActive: false });
    return { message: 'Cliente desactivado correctamente' };
    }
}