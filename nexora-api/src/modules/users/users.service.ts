import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
    constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

    async findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } });
    }

    async create(data: { email: string; passwordHash: string; fullName: string }): Promise<User> {
    const user = this.repo.create(data);
    return this.repo.save(user);
    }
}