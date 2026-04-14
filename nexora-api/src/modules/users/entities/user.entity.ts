import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Exclude } from 'class-transformer';
import { CompanyUser } from '../../companies/entities/company-user.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ unique: true, length: 255 }) email!: string;
  @Column({ name: 'password_hash' }) @Exclude() passwordHash!: string;
  @Column({ name: 'full_name', length: 200 }) fullName!: string;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;
  @OneToMany(() => CompanyUser, (cu) => cu.user) companyUsers!: CompanyUser[];
}
