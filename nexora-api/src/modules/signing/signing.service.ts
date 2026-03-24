import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
// ⚠️ PENDIENTE CRÍTICO — Esta implementación es base.
// La firma XAdES-BES real para Ecuador DEBE validarse contra
// la ficha técnica oficial del SRI antes de usar en producción.
// Probar en ambiente de pruebas del SRI antes de ir a producción.
@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);

  async signXml(
    xmlString: string,
    p12Buffer: Buffer,
    passphrase: string,
  ): Promise<string> {
    try {
      const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
      const p12 = forge.pkcs12.pkcs12FromAsn1(
        forge.asn1.fromDer(p12Der),
        passphrase,
      );

      const keyBags = p12.getBags({
        bagType: forge.pki.oids.pkcs8ShroudedKeyBag,
      });
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

      const privateKey =
        keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
      const certificate = certBags[forge.pki.oids.certBag]?.[0]?.cert;

      if (!privateKey || !certificate) {
        throw new Error('No se pudo extraer clave/certificado del .p12');
      }

      // Digest del contenido
      const md = forge.md.sha1.create();
      md.update(xmlString, 'utf8');
      const digestB64 = forge.util.encode64(md.digest().bytes());

      // Firmar el SignedInfo
      const signedInfo = this.buildSignedInfo(digestB64);
      const mdSign = forge.md.sha1.create();
      mdSign.update(signedInfo, 'utf8');
      const sigB64 = forge.util.encode64(privateKey.sign(mdSign));

      // Certificado en base64
      const certB64 = forge.util.encode64(
        forge.asn1.toDer(forge.pki.certificateToAsn1(certificate)).bytes(),
      );

      return this.injectSignature(xmlString, signedInfo, sigB64, certB64);
    } catch (err) {
      this.logger.error('Error en firma XML', err.message);
      throw new Error(`Firma fallida: ${err.message}`);
    }
  }

  // ⚠️ Estructura XAdES-BES — VERIFICAR con ficha técnica SRI
  private buildSignedInfo(digest: string): string {
    return (
      '<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">' +
      '<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>' +
      '<ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>' +
      '<ds:Reference URI="">' +
      '<ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>' +
      `<ds:DigestValue>${digest}</ds:DigestValue>` +
      '</ds:Reference>' +
      '</ds:SignedInfo>'
    );
  }

  private injectSignature(
    xml: string,
    signedInfo: string,
    sig: string,
    cert: string,
  ): string {
    const block =
      '<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">' +
      signedInfo +
      `<ds:SignatureValue>${sig}</ds:SignatureValue>` +
      '<ds:KeyInfo><ds:X509Data>' +
      `<ds:X509Certificate>${cert}</ds:X509Certificate>` +
      '</ds:X509Data></ds:KeyInfo>' +
      '</ds:Signature>';

    //Insertar antes del último tag de cierre
    const pos = xml.lastIndexOf('</');
    return xml.substring(0, pos) + block + xml.substring(pos);
  }
}