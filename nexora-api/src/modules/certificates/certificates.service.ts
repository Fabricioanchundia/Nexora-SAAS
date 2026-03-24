// src/modules/certificates/certificates.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as forge from 'node-forge';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { Certificate } from './entities/certificate.entity';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class CertificatesService {
  private readonly logger = new Logger(CertificatesService.name);
  private readonly encryptionKey: string;
  private readonly ALGORITHM = 'aes-256-gcm';

  constructor(
    @InjectRepository(Certificate)
    private readonly certRepo: Repository<Certificate>,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService,
  ) {
    const key = this.configService.get<string>('app.certificateEncryptionKey');
    if (!key || key.length < 32) {
      throw new Error(
        'CERTIFICATE_ENCRYPTION_KEY debe tener al menos 32 caracteres',
      );
    }
    this.encryptionKey = key;
  }

  async upload(
    companyId: string,
    fileBuffer: Buffer,
    passphrase: string,
  ): Promise<Certificate> {
    // 1. Validar que el .p12 es válido con el passphrase dado
    const certInfo = await this.extractCertInfo(fileBuffer, passphrase);

    // 2. Verificar que no esté vencido
    if (certInfo.validUntil < new Date()) {
      throw new BadRequestException(
        `El certificado venció el ${certInfo.validUntil.toLocaleDateString()}`,
      );
    }

    // 3. Encriptar el passphrase ANTES de guardar cualquier cosa
    const passphraseEncrypted = this.encryptPassphrase(passphrase);

    // 4. Guardar el archivo .p12 en storage (también encriptado en reposo
    //    si el storage driver lo soporta — recomendado para producción)
    const filePath = `${companyId}/certificates/${Date.now()}.p12`;
    await this.storageService.upload(filePath, fileBuffer);

    // 5. Desactivar certificados anteriores
    await this.certRepo.update(
      { companyId, isActive: true },
      { isActive: false },
    );

    // 6. Guardar el nuevo
    const cert = this.certRepo.create({
      companyId,
      filePath,
      passphraseEncrypted,
      validFrom: certInfo.validFrom,
      validUntil: certInfo.validUntil,
      holderName: certInfo.holderName,
      isActive: true,
    });

    return this.certRepo.save(cert);
  }

  async getActiveCertificate(companyId: string): Promise<Certificate> {
    const cert = await this.certRepo.findOne({
      where: { companyId, isActive: true },
    });
    if (!cert) {
      throw new NotFoundException(
        'No hay un certificado activo para esta empresa. ' +
          'Por favor sube tu certificado .p12 antes de emitir comprobantes.',
      );
    }
    if (!cert.isValid()) {
      throw new BadRequestException(
        `El certificado venció el ${cert.validUntil.toLocaleDateString()}. ` +
          'Por favor sube un certificado vigente.',
      );
    }
    return cert;
  }

  // Devuelve el buffer del .p12 y el passphrase en claro
  // SOLO llamar desde el worker de firma — nunca exponer en endpoints HTTP
  async getCertificateForSigning(
    companyId: string,
  ): Promise<{ buffer: Buffer; passphrase: string }> {
    const cert = await this.getActiveCertificate(companyId);
    const buffer = await this.storageService.download(cert.filePath);
    const passphrase = this.decryptPassphrase(cert.passphraseEncrypted);
    return { buffer, passphrase };
  }

  // ─── Extracción de info del certificado ─────────────────────────────────────
  private async extractCertInfo(
    p12Buffer: Buffer,
    passphrase: string,
  ): Promise<{ validFrom: Date; validUntil: Date; holderName: string }> {
    try {
      const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });
      const bag = certBags[forge.pki.oids.certBag]?.[0];

      if (!bag?.cert) {
        throw new BadRequestException(
          'No se encontró un certificado válido en el archivo .p12',
        );
      }

      const cert = bag.cert;
      const subject = cert.subject.getField('CN')?.value || 'Desconocido';

      return {
        validFrom: cert.validity.notBefore,
        validUntil: cert.validity.notAfter,
        holderName: subject,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Error procesando .p12', error.message);
      throw new BadRequestException(
        'El archivo .p12 no es válido o la contraseña es incorrecta',
      );
    }
  }

  // ─── Encriptación del passphrase ─────────────────────────────────────────────
  private encryptPassphrase(passphrase: string): string {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.encryptionKey, 'nexora-salt', 32);
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    const encrypted = Buffer.concat([
      cipher.update(passphrase, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    // Formato: iv:tag:encrypted (todo en hex)
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  private decryptPassphrase(encrypted: string): string {
    const [ivHex, tagHex, encryptedHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const encryptedBuffer = Buffer.from(encryptedHex, 'hex');
    const key = crypto.scryptSync(this.encryptionKey, 'nexora-salt', 32);

    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    return decipher.update(encryptedBuffer).toString('utf8') + decipher.final('utf8');
  }
}