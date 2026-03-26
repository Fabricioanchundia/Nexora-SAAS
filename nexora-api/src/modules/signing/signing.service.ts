import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import {
  CertificateExpiredError,
  CertificateInvalidError,
  SigningError,
} from '../../common/errors/nexora.errors';

interface CachedCert {
  privateKey: forge.pki.rsa.PrivateKey;
  certificate: forge.pki.Certificate;
  certDerB64: string;
  validUntil: Date;
  cachedAt: Date;
}

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);
  private readonly certCache = new Map<string, CachedCert>();

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
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error firmando XML empresa=${companyId}: ${msg}`);
      throw new SigningError(msg);
    }
  }

  async validateP12(p12Buffer: Buffer, passphrase: string) {
    const { certificate } = this.parseP12(p12Buffer, passphrase);
    const now = new Date();
    const msLeft = certificate.validity.notAfter.getTime() - now.getTime();
    return {
      holderName: certificate.subject.getField('CN')?.value ?? 'Desconocido',
      validFrom: certificate.validity.notBefore,
      validUntil: certificate.validity.notAfter,
      isValid:
        certificate.validity.notBefore <= now &&
        certificate.validity.notAfter >= now,
      daysUntilExpiry: Math.floor(msLeft / (1000 * 60 * 60 * 24)),
    };
  }

  clearCache(companyId: string): void {
    this.certCache.delete(companyId);
  }

  // ─── Carga con cache ──────────────────────────────────────────────────────
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

    const certAsn1 = forge.pki.certificateToAsn1(certificate);
    const certDer = forge.asn1.toDer(certAsn1);
    // ← FIX: usar certDer.getBytes() en vez de certDer.bytes()
    // para obtener string compatible con forge.util.encode64
    const certDerB64 = forge.util.encode64(certDer.getBytes());

    const entry: CachedCert = {
      privateKey,
      certificate,
      certDerB64,
      validUntil: certificate.validity.notAfter,
      cachedAt: now,
    };
    this.certCache.set(companyId, entry);
    return entry;
  }

  // ─── Parse del .p12 ───────────────────────────────────────────────────────
  private parseP12(
    p12Buffer: Buffer,
    passphrase: string,
  ): {
    privateKey: forge.pki.rsa.PrivateKey;
    certificate: forge.pki.Certificate;
  } {
    let p12: forge.pkcs12.Pkcs12Pfx;
    try {
      // ← FIX: convertir Buffer a string binario correctamente
      const binaryString = p12Buffer.toString('binary');
      const p12Der = forge.util.createBuffer(binaryString);
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);
    } catch {
      throw new CertificateInvalidError(
        'Archivo .p12 inválido o contraseña incorrecta.',
      );
    }

    const keyBags = p12.getBags({
      bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
    });
    const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

    const privateKey = keyBags[
      forge.pki.oids.pkcs8ShroudedKeyBag
    ]?.[0]?.key as forge.pki.rsa.PrivateKey | undefined;
    const certificate = certBags[forge.pki.oids.certBag]?.[0]?.cert;

    if (!privateKey || !certificate) {
      throw new CertificateInvalidError(
        'El .p12 no contiene clave privada o certificado válido.',
      );
    }
    return { privateKey, certificate };
  }

  // ─── XAdES-BES ────────────────────────────────────────────────────────────
  // ⚠️ PENDIENTE VALIDACIÓN CON SRI
  // Ver Anexo 14 ficha técnica SRI v2.26
  private applyXadesBes(xmlString: string, cert: CachedCert): string {
    const { privateKey, certificate, certDerB64 } = cert;

    const signatureId = 'SignatureXADES';
    const signedPropsId = 'SignedPropertiesId';
    const signingTime = new Date().toISOString();

    // ⚠️ PENDIENTE: canonicalizar con C14N real antes del digest
    const contentMd = forge.md.sha1.create();
    // ← FIX: usar 'utf8' que es el tipo correcto para forge
    contentMd.update(xmlString, 'utf8');
    const contentDigestB64 = forge.util.encode64(contentMd.digest().getBytes());

    // Digest del certificado para SigningCertificate
    const certMd = forge.md.sha1.create();
    // ← FIX: getBytes() devuelve string — tipo correcto para update con 'raw'
    certMd.update(forge.util.decode64(certDerB64), 'raw');
    const certDigestB64 = forge.util.encode64(certMd.digest().getBytes());

    // Issuer y SerialNumber
    const issuerDN = certificate.issuer.attributes
      .map((a) => `${String(a.shortName ?? '')}=${String(a.value ?? '')}`)
      .join(',');
    const serialNumber = String(certificate.serialNumber);

    // QualifyingProperties — XAdES-BES
    // ⚠️ PENDIENTE: validar namespaces y estructura exacta con SRI
    const qualifyingProps =
      `<xades:QualifyingProperties xmlns:xades="http://uri.etsi.org/01903/v1.3.2#" Target="#${signatureId}">` +
      `<xades:SignedProperties Id="${signedPropsId}">` +
      `<xades:SignedSignatureProperties>` +
      `<xades:SigningTime>${signingTime}</xades:SigningTime>` +
      `<xades:SigningCertificate>` +
      `<xades:Cert>` +
      `<xades:CertDigest>` +
      `<ds:DigestMethod xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<ds:DigestValue xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${certDigestB64}</ds:DigestValue>` +
      `</xades:CertDigest>` +
      `<xades:IssuerSerial>` +
      `<ds:X509IssuerName xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${issuerDN}</ds:X509IssuerName>` +
      `<ds:X509SerialNumber xmlns:ds="http://www.w3.org/2000/09/xmldsig#">${serialNumber}</ds:X509SerialNumber>` +
      `</xades:IssuerSerial>` +
      `</xades:Cert>` +
      `</xades:SigningCertificate>` +
      `</xades:SignedSignatureProperties>` +
      `</xades:SignedProperties>` +
      `</xades:QualifyingProperties>`;

    const signedPropsMd = forge.md.sha1.create();
    signedPropsMd.update(qualifyingProps, 'utf8');
    const signedPropsDigestB64 = forge.util.encode64(
      signedPropsMd.digest().getBytes(),
    );

    const signedInfo =
      `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">` +
      `<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>` +
      `<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>` +
      `<ds:Reference URI="">` +
      `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<ds:DigestValue>${contentDigestB64}</ds:DigestValue>` +
      `</ds:Reference>` +
      `<ds:Reference URI="#${signedPropsId}" Type="http://uri.etsi.org/01903#SignedProperties">` +
      `<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>` +
      `<ds:DigestValue>${signedPropsDigestB64}</ds:DigestValue>` +
      `</ds:Reference>` +
      `</ds:SignedInfo>`;

    const signMd = forge.md.sha1.create();
    signMd.update(signedInfo, 'utf8');
    const signatureValueB64 = forge.util.encode64(privateKey.sign(signMd));

    const signatureNode =
      `<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#" Id="${signatureId}">` +
      signedInfo +
      `<ds:SignatureValue>${signatureValueB64}</ds:SignatureValue>` +
      `<ds:KeyInfo>` +
      `<ds:X509Data>` +
      `<ds:X509Certificate>${certDerB64}</ds:X509Certificate>` +
      `</ds:X509Data>` +
      `</ds:KeyInfo>` +
      `<ds:Object>` +
      qualifyingProps +
      `</ds:Object>` +
      `</ds:Signature>`;

    const lastClose = xmlString.lastIndexOf('</');
    if (lastClose === -1) {
      throw new SigningError('XML malformado: sin tag de cierre raíz');
    }
    return xmlString.substring(0, lastClose) + signatureNode + xmlString.substring(lastClose);
  }
}