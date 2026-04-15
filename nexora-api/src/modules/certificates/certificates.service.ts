import {
  BadRequestException, Injectable, Logger, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as forge from 'node-forge';
import * as crypto from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Certificate } from './entities/certificate.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly ALGORITHM = 'aes-256-gcm';
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(Certificate) private readonly repo: Repository<Certificate>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    this.encryptionKey =
      this.configService.get<string>('app.certificateEncryptionKey') || '';
    if (this.encryptionKey.length < 32) {
      this.logger.warn('CERTIFICATE_ENCRYPTION_KEY debe tener al menos 32 caracteres');
    }
  }

  async upload(companyId: string, fileBuffer: Buffer, passphrase: string): Promise<Certificate> {
    const info = await this.extractCertInfo(fileBuffer, passphrase);
    if (new Date(info.validUntil) < new Date()) {
      throw new BadRequestException(
        `El certificado venció el ${new Date(info.validUntil).toLocaleDateString()}`,
      );
    }
    const passphraseEncrypted = this.encrypt(passphrase);
    const filePath = `${companyId}/certificates/${Date.now()}.p12`;
    await this.storageService.upload(filePath, fileBuffer);
    await this.repo.update({ companyId, isActive: true }, { isActive: false });
    return this.repo.save(
      this.repo.create({
        companyId, filePath, passphraseEncrypted,
        validFrom: info.validFrom, validUntil: info.validUntil,
        holderName: info.holderName, isActive: true,
      }),
    );
  }

  async getActive(companyId: string): Promise<Certificate> {
    const cert = await this.repo.findOne({ where: { companyId, isActive: true } });
    if (!cert) {
      throw new NotFoundException(
        'No hay certificado activo. Sube tu archivo .p12 en Configuración → Certificados.',
      );
    }
    if (!cert.isValid()) {
      throw new BadRequestException(
        `El certificado venció el ${new Date(cert.validUntil).toLocaleDateString()}. Sube uno nuevo.`,
      );
    }
    return cert;
  }

  async getCertForSigning(companyId: string): Promise<{ buffer: Buffer; passphrase: string }> {
    const cert = await this.getActive(companyId);
    const buffer = await this.storageService.download(cert.filePath);
    return { buffer, passphrase: this.decrypt(cert.passphraseEncrypted) };
  }

  async findAll(companyId: string): Promise<Certificate[]> {
    return this.repo.find({ where: { companyId }, order: { createdAt: 'DESC' } });
  }

  private async extractCertInfo(p12Buffer: Buffer, passphrase: string) {
    try {
      const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(p12Der), passphrase);
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const bag = certBags[forge.pki.oids.certBag]?.[0];
      if (!bag?.cert) throw new BadRequestException('Certificado no encontrado dentro del .p12');
      return {
        validFrom: bag.cert.validity.notBefore,
        validUntil: bag.cert.validity.notAfter,
        holderName: bag.cert.subject.getField('CN')?.value || 'Desconocido',
      };
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Error procesando .p12', err instanceof Error ? err.message : String(err));
      throw new BadRequestException(
        'El archivo .p12 no es válido o la contraseña es incorrecta',
      );
    }
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'nexora-salt', 32);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decrypt(encrypted: string): string {
    const [ivHex, tagHex, encHex] = encrypted.split(':');
    const key = crypto.scryptSync(this.encryptionKey, 'nexora-salt', 32);
    const decipher = crypto.createDecipheriv(
      this.ALGORITHM, key, Buffer.from(ivHex, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return (
      decipher.update(Buffer.from(encHex, 'hex')).toString('utf8') +
      decipher.final('utf8')
    );
  }
}