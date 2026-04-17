import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'company_id' }) companyId!: string;
  @Column({ name: 'file_path', length: 500 }) filePath!: string;
  @Column({ name: 'passphrase_encrypted', length: 500 }) passphraseEncrypted!: string;
  @Column({ name: 'valid_from', type: 'date' }) validFrom!: Date;
  @Column({ name: 'valid_until', type: 'date' }) validUntil!: Date;
  @Column({ name: 'holder_name', type: 'varchar', length: 300, nullable: true }) holderName!: string | null;
  @Column({ name: 'is_active', default: true }) isActive!: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt!: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt!: Date;

  @ManyToOne(() => Company, (c) => c.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' }) company!: Company;

  isValid(): boolean {
    const now = new Date();
    return this.isActive && new Date(this.validFrom) <= now && new Date(this.validUntil) >= now;
  }

  expiresWithinDays(days: number): boolean {
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    return new Date(this.validUntil) <= limit;
  }
}
