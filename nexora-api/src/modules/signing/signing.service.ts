// src/modules/signing/signing.service.ts
import { Injectable, Logger } from '@nestjs/common';
import * as forge from 'node-forge';
import { create as createXml } from 'xmlbuilder2';

// ⚠️ PENDIENTE DE PARAMETRIZACIÓN CRÍTICA
// La firma de comprobantes electrónicos en Ecuador usa XAdES-BES
// según la ficha técnica del SRI. El formato exacto de la firma
// (estructura del nodo ds:Signature, namespaces, canonicalización)
// DEBE verificarse contra la ficha técnica vigente del SRI.
//
// Esta implementación usa una estructura base de XMLDSig estándar.
// ANTES de usar en producción: validar contra el validador del SRI
// y contra ejemplos de la ficha técnica oficial.

@Injectable()
export class SigningService {
  private readonly logger = new Logger(SigningService.name);

  async signXml(xmlString: string, p12Buffer: Buffer, passphrase: string): Promise<string> {
    try {
      // 1. Parsear el .p12
      const p12Der = forge.util.createBuffer(p12Buffer.toString('binary'));
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, passphrase);

      // 2. Extraer clave privada y certificado
      const keyBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag });
      const certBags = p12.getBags({ bagType: forge.pki.oids.certBag });

      const privateKey = keyBags[forge.pki.oids.pkcs8ShroudedKeyBag]?.[0]?.key;
      const certificate = certBags[forge.pki.oids.certBag]?.[0]?.cert;

      if (!privateKey || !certificate) {
        throw new Error('No se pudo extraer la clave privada o el certificado del .p12');
      }

      // 3. Firmar
      // ⚠️ La implementación XAdES-BES completa requiere:
      //    - Canonicalización C14N del contenido
      //    - Referencias con digest SHA-1 o SHA-256 según ficha técnica SRI
      //    - Nodo ds:SignedInfo con el algoritmo correcto
      //    - KeyInfo con el certificado en base64
      //    - Estructura específica de propiedades XAdES
      // Esta es una implementación base — VERIFICAR con ficha técnica SRI

      const signedXml = this.applyXmlDsig(xmlString, privateKey, certificate);
      return signedXml;
    } catch (error) {
      this.logger.error('Error en firma XML', error.message);
      throw new Error(`Firma fallida: ${error.message}`);
    }
  }

  // ⚠️ IMPLEMENTACIÓN PARCIAL — requiere ajuste según ficha técnica SRI
  // Este método debe producir un XML que pase la validación del SRI Ecuador
  private applyXmlDsig(
    xmlString: string,
    privateKey: forge.pki.rsa.PrivateKey,
    certificate: forge.pki.Certificate,
  ): string {
    // Calcular digest del contenido canonicalizado
    const md = forge.md.sha1.create(); // ⚠️ Verificar algoritmo con ficha técnica
    md.update(xmlString, 'utf8');
    const digestBase64 = forge.util.encode64(md.digest().bytes());

    // Construir el bloque SignedInfo
    const signedInfoXml = this.buildSignedInfo(digestBase64);

    // Firmar el SignedInfo
    const mdForSign = forge.md.sha1.create();
    mdForSign.update(signedInfoXml, 'utf8');
    const signature = privateKey.sign(mdForSign);
    const signatureBase64 = forge.util.encode64(signature);

    // Certificado en base64
    const certDer = forge.asn1.toDer(forge.pki.certificateToAsn1(certificate));
    const certBase64 = forge.util.encode64(certDer.bytes());

    // Inyectar el nodo Signature al XML original
    // ⚠️ La posición exacta del nodo en el XML depende de la ficha técnica SRI
    return this.injectSignatureNode(xmlString, signedInfoXml, signatureBase64, certBase64);
  }

  private buildSignedInfo(digestBase64: string): string {
    // ⚠️ Estructura según ficha técnica SRI — VERIFICAR namespaces y algoritmos
    return `<ds:SignedInfo xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  <ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>
  <ds:SignatureMethod Algorithm="http://www.w3.org/2000/09/xmldsig#rsa-sha1"/>
  <ds:Reference URI="">
    <ds:DigestMethod Algorithm="http://www.w3.org/2000/09/xmldsig#sha1"/>
    <ds:DigestValue>${digestBase64}</ds:DigestValue>
  </ds:Reference>
</ds:SignedInfo>`;
  }

  private injectSignatureNode(
    xmlString: string,
    signedInfo: string,
    signatureBase64: string,
    certBase64: string,
  ): string {
    const signatureBlock = `
<ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">
  ${signedInfo}
  <ds:SignatureValue>${signatureBase64}</ds:SignatureValue>
  <ds:KeyInfo>
    <ds:X509Data>
      <ds:X509Certificate>${certBase64}</ds:X509Certificate>
    </ds:X509Data>
  </ds:KeyInfo>
</ds:Signature>`;

    // ⚠️ Posición de inserción según ficha técnica SRI
    // Normalmente al final del elemento raíz, antes del cierre
    const closingTag = xmlString.lastIndexOf('</');
    const rootClose = xmlString.indexOf('>', closingTag);
    const insertPos = xmlString.lastIndexOf('</', closingTag);

    return (
      xmlString.substring(0, insertPos) +
      signatureBlock +
      xmlString.substring(insertPos)
    );
  }
}