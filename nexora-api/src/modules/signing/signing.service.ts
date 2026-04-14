import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import * as crypto from 'crypto';
import {
  CertificateExpiredError,
  CertificateInvalidError,
  SigningError,
} from '../../common/errors/nexora.errors';
import { classifySigningError } from './signing-error.types';

// @ts-ignore
import { C14nCanonicalization } from 'xml-crypto';
// @ts-ignore
import { DOMParser } from '@xmldom/xmldom';

const DS       = 'http://www.w3.org/2000/09/xmldsig#';
const XADES    = 'http://uri.etsi.org/01903/v1.3.2#';
const XADES141 = 'http://uri.etsi.org/01903/v1.4.1#';

const OID_SHORT: Record<string, string> = {
  '2.5.4.6':  'C',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.7':  'L',
  '2.5.4.3':  'CN',
  '2.5.4.5':  'SERIALNUMBER',
};

interface CachedCert {
  privateKeyPem: string;
  certB64: string;
  certSha256: string;
  issuerDN: string;
  serialDecimal: string;
  validUntil: Date;
  cachedAt: Date;
}

const CACHE_TTL_MS = 10 * 60 * 1000;

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);
  private readonly certCache = new Map<string, CachedCert>();

  // ─── Método principal ────────────────────────────────────────────────────
  async signXml(
    xmlString: string,
    p12Buffer: Buffer,
    passphrase: string,
    companyId: string,
  ): Promise<string> {
    const cert = await this.loadCertificate(p12Buffer, passphrase, companyId);
    try {
      return this.applyXadesBes(xmlString, cert);
    } catch (err) {
      const classified = classifySigningError(err);
      this.logger.error(
        `Error firmando empresa=${companyId} tipo=${classified.type}: ${classified.message}`,
      );
      throw err;
    }
  }

  // ─── Validación del .p12 ────────────────────────────────────────────────
  async validateP12(p12Buffer: Buffer, passphrase: string) {
    const { certificate } = this.parseP12(p12Buffer, passphrase);
    const now = new Date();
    const msLeft = certificate.validity.notAfter.getTime() - now.getTime();
    return {
      holderName: certificate.subject.getField('CN')?.value ?? 'Desconocido',
      validFrom:  certificate.validity.notBefore,
      validUntil: certificate.validity.notAfter,
      isValid:    certificate.validity.notBefore <= now && certificate.validity.notAfter >= now,
      daysUntilExpiry: Math.floor(msLeft / (1000 * 60 * 60 * 24)),
    };
  }

  clearCache(companyId: string): void {
    this.certCache.delete(companyId);
  }

  // ─── Carga con cache ────────────────────────────────────────────────────
  private async loadCertificate(
    p12Buffer: Buffer,
    passphrase: string,
    companyId: string,
  ): Promise<CachedCert> {
    const now = new Date();
    const cached = this.certCache.get(companyId);
    if (
      cached &&
      now.getTime() - cached.cachedAt.getTime() < CACHE_TTL_MS &&
      cached.validUntil > now
    ) {
      return cached;
    }

    const { privateKey, certificate } = this.parseP12(p12Buffer, passphrase);

    if (certificate.validity.notAfter < now) {
      this.certCache.delete(companyId);
      throw new CertificateExpiredError(certificate.validity.notAfter);
    }

    // Clave privada como PEM
    const privateKeyPem = forge.pki.privateKeyToPem(privateKey);

    // Certificado como DER base64
    const certDer    = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).getBytes(), 'binary');
    const certB64    = certDer.toString('base64');
    const certSha256 = crypto.createHash('sha256').update(certDer).digest('base64');

    // IssuerDN en orden inverso (como Java/BouncyCastle — requerido por el SRI)
    const issuerDN = certificate.issuer.attributes
      .map((a: any) => `${OID_SHORT[a.type] ?? a.name}=${a.value}`)
      .reverse()
      .join(',');

    const serialDecimal = BigInt('0x' + certificate.serialNumber).toString(10);

    const entry: CachedCert = {
      privateKeyPem, certB64, certSha256, issuerDN, serialDecimal,
      validUntil: certificate.validity.notAfter,
      cachedAt: now,
    };
    this.certCache.set(companyId, entry);
    return entry;
  }

  // ─── Parse del .p12 ─────────────────────────────────────────────────────
  // El .p12 del BCE tiene DOS claves privadas y DOS certificados:
  //   [0] = keyEncipherment (NO usar para firma)
  //   [1] = digitalSignature (usar para firma electrónica SRI)
  private parseP12(p12Buffer: Buffer, passphrase: string) {
    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      p12 = forge.pkcs12.pkcs12FromAsn1(
        forge.asn1.fromDer(forge.util.createBuffer(p12Buffer.toString('binary'))),
        passphrase,
      );
    } catch {
      throw new CertificateInvalidError('Archivo .p12 inválido o contraseña incorrecta.');
    }

    const keyBags  = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[forge.pki.oids.pkcs8ShroudedKeyBag] ?? [];
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ?? [];

    // Usar índice [1] = clave/cert de digitalSignature
    const privateKey  = keyBags[1]?.key as forge.pki.rsa.PrivateKey | undefined;
    const certificate = certBags[1]?.cert;

    if (!privateKey || !certificate) {
      throw new CertificateInvalidError('El .p12 no contiene clave de firma digital válida.');
    }
    return { privateKey, certificate };
  }

  // ─── XAdES-BES ──────────────────────────────────────────────────────────
  private applyXadesBes(xmlString: string, cert: CachedCert): string {
    const { privateKeyPem, certB64, certSha256, issuerDN, serialDecimal } = cert;

    const sigId   = `xmldsig-${crypto.randomUUID()}`;
    const spId    = `${sigId}-signedprops`;
    const refId   = `${sigId}-ref0`;
    const sigTime = new Date().toISOString();

    // 1. Digest del comprobante con C14N
    const compC14n   = this.c14n(xmlString);
    const digestComp = crypto.createHash('sha256').update(compC14n).digest('base64');

    // 2. SignedProperties con namespaces explícitos
    //    CRÍTICO: incluir xmlns:xades141 y xmlns:ds para que el digest
    //    sea consistente con el XML final (donde hereda esos namespaces del QP padre)
    const spXml =
      `<xades:SignedProperties xmlns:xades="${XADES}" xmlns:xades141="${XADES141}" xmlns:ds="${DS}" Id="${spId}">` +
      `<xades:SignedSignatureProperties>` +
      `<xades:SigningTime>${sigTime}</xades:SigningTime>` +
      `<xades:SigningCertificate><xades:Cert>` +
      `<xades:CertDigest>` +
      `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
      `<ds:DigestValue>${certSha256}</ds:DigestValue>` +
      `</xades:CertDigest>` +
      `<xades:IssuerSerial>` +
      `<ds:X509IssuerName>${issuerDN}</ds:X509IssuerName>` +
      `<ds:X509SerialNumber>${serialDecimal}</ds:X509SerialNumber>` +
      `</xades:IssuerSerial>` +
      `</xades:Cert></xades:SigningCertificate>` +
      `</xades:SignedSignatureProperties>` +
      `<xades:SignedDataObjectProperties>` +
      `<xades:DataObjectFormat ObjectReference="#${refId}">` +
      `<xades:Description>FIRMA DIGITAL SRI</xades:Description>` +
      `<xades:MimeType>text/xml</xades:MimeType>` +
      `<xades:Encoding>UTF-8</xades:Encoding>` +
      `</xades:DataObjectFormat>` +
      `</xades:SignedDataObjectProperties>` +
      `</xades:SignedProperties>`;

    const digestSP = crypto.createHash('sha256').update(this.c14n(spXml)).digest('base64');

    // 3. SignedInfo y firma RSA-SHA256
    const siXml =
      `<ds:SignedInfo xmlns:ds="${DS}">` +
      `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>` +
      `<ds:Reference Id="${refId}" URI="#comprobante">` +
      `<ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></ds:Transforms>` +
      `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
      `<ds:DigestValue>${digestComp}</ds:DigestValue>` +
      `</ds:Reference>` +
      `<ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#${spId}">` +
      `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
      `<ds:DigestValue>${digestSP}</ds:DigestValue>` +
      `</ds:Reference>` +
      `</ds:SignedInfo>`;

    const siC14n   = this.c14n(siXml);
    const sign     = crypto.createSign('RSA-SHA256');
    sign.update(siC14n);
    const sigValue = sign.sign(privateKeyPem, 'base64');

    // 4. Ensamble final
    const qpXml =
      `<xades:QualifyingProperties xmlns:xades="${XADES}" xmlns:xades141="${XADES141}" Target="#${sigId}">` +
      spXml +
      `</xades:QualifyingProperties>`;

    const signature =
      `<ds:Signature xmlns:ds="${DS}" Id="${sigId}">` +
      siXml +
      `<ds:SignatureValue Id="${sigId}-sigvalue">${sigValue}</ds:SignatureValue>` +
      `<ds:KeyInfo><ds:X509Data>` +
      `<ds:X509Certificate>${certB64}</ds:X509Certificate>` +
      `</ds:X509Data></ds:KeyInfo>` +
      `<ds:Object>${qpXml}</ds:Object>` +
      `</ds:Signature>`;

    const lastClose = xmlString.lastIndexOf('</');
    if (lastClose === -1) throw new SigningError('XML malformado: sin tag de cierre raíz');

    return xmlString.substring(0, lastClose) + signature + xmlString.substring(lastClose);
  }

  // ─── C14N helper ────────────────────────────────────────────────────────
  private c14n(xmlStr: string): Buffer {
    const doc    = new DOMParser().parseFromString(xmlStr, 'text/xml');
    const result: string = new C14nCanonicalization().process(doc.documentElement);
    return Buffer.from(result, 'utf-8');
  }
}
