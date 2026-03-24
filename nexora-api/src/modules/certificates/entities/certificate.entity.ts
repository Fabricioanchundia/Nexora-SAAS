import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'company_id' })
  companyId: string;

  // Ruta en el sistema de almacenamiento — el archivo .p12 va encriptado
  @Column({ name: 'file_path', length: 500 })
  filePath: string;

  // El passphrase del .p12 se guarda encriptado con CERTIFICATE_ENCRYPTION_KEY
  // NUNCA guardar en texto plano
  @Column({ name: 'passphrase_encrypted', length: 500 })
  passphraseEncrypted: string;

  @Column({ name: 'valid_from', type: 'date' })
  validFrom: Date;

  @Column({ name: 'valid_until', type: 'date' })
  validUntil: Date;

  // Nombre del titular del certificado (extraído del .p12)
  @Column({ name: 'holder_name', length: 300, nullable: true })
  holderName: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Company, (c) => c.certificates, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id' })
  company: Company;

  // Método de dominio: ¿el certificado está vigente?
  isValid(): boolean {
    const now = new Date();
    return this.isActive && this.validFrom <= now && this.validUntil >= now;
  }

  // ¿vence en los próximos N días?
  expiresWithinDays(days: number): boolean {
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    return this.validUntil <= limit;
  }
}