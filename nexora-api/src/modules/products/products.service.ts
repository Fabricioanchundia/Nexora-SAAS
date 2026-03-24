import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
  ) {}

  create(dto: CreateProductDto, companyId: string) {
    return this.repo.save(this.repo.create({ ...dto, companyId }));
  }

  findAll(companyId: string) {
    return this.repo.find({
      where: { companyId, isActive: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string, companyId: string): Promise<Product> {
    const p = await this.repo.findOne({ where: { id, companyId } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return p;
  }

  async update(id: string, dto: UpdateProductDto, companyId: string): Promise<Product> {
    await this.findOne(id, companyId);
    await this.repo.update({ id, companyId }, dto as any);
    return this.findOne(id, companyId);
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    await this.repo.update({ id, companyId }, { isActive: false });
    return { message: 'Producto desactivado' };
  }
}