// USO: npx ts-node scripts/diagnose-signing.ts ./factura-firmada.xml

import * as fs from 'fs';
import * as forge from 'node-forge';

const xmlPath = process.argv[2] || './test-output/factura-firmada.xml';

function diagnose() {
  console.log('\n🔍 Diagnóstico de firma XML\n');

  if (!fs.existsSync(xmlPath)) {
    console.error(`❌ No se encontró: ${xmlPath}`);
    console.error('   Primero corre test-sri-flow.ts para generar el XML firmado');
    process.exit(1);
  }

  const xml = fs.readFileSync(xmlPath, 'utf-8');

  // Verificación 1: nodo Signature presente
  check('Nodo ds:Signature presente', xml.includes('<ds:Signature'));

  // Verificación 2: SignedInfo presente
  check('Nodo ds:SignedInfo presente', xml.includes('<ds:SignedInfo'));

  // Verificación 3: SignatureValue presente y no vacío
  const svMatch = xml.match(/<ds:SignatureValue>([A-Za-z0-9+/=\s]+)<\/ds:SignatureValue>/);
  check('SignatureValue presente y no vacío', !!svMatch && svMatch[1].trim().length > 100);

  // Verificación 4: X509Certificate presente
  const certMatch = xml.match(/<ds:X509Certificate>([A-Za-z0-9+/=\s]+)<\/ds:X509Certificate>/);
  check('X509Certificate presente', !!certMatch);

  // Verificación 5: QualifyingProperties (XAdES-BES)
  check('QualifyingProperties presente', xml.includes('QualifyingProperties'));
  check('SignedProperties presente', xml.includes('SignedProperties'));
  check('SigningTime presente', xml.includes('SigningTime'));
  check('SigningCertificate presente', xml.includes('SigningCertificate'));

  // Verificación 6: algoritmos correctos
  check(
    'CanonicalizationMethod C14N correcto',
    xml.includes('http://www.w3.org/TR/2001/REC-xml-c14n-20010315'),
  );
  check(
    'SignatureMethod RSA-SHA1 correcto',
    xml.includes('http://www.w3.org/2000/09/xmldsig#rsa-sha1'),
  );
  check(
    'DigestMethod SHA1 correcto',
    xml.includes('http://www.w3.org/2000/09/xmldsig#sha1'),
  );

  // Verificación 7: XAdES namespace correcto
  check(
    'Namespace XAdES-BES correcto',
    xml.includes('http://uri.etsi.org/01903/v1.3.2#'),
  );

  // Verificación 8: Reference a SignedProperties
  check(
    'Reference a SignedProperties presente',
    xml.includes('http://uri.etsi.org/01903#SignedProperties'),
  );

  // Verificación 9: el certificado en el XML es válido
  if (certMatch) {
    try {
      const certB64 = certMatch[1].replace(/\s/g, '');
      const certDer = forge.util.decode64(certB64);
      const certAsn1 = forge.asn1.fromDer(certDer);
      const cert = forge.pki.certificateFromAsn1(certAsn1);
      const now = new Date();
      const isValid = cert.validity.notBefore <= now && cert.validity.notAfter >= now;

      check(`Certificado vigente hasta ${cert.validity.notAfter.toLocaleDateString('es-EC')}`, isValid);

      if (!isValid) {
        console.log('   ⚠️  El certificado está vencido — el SRI lo rechazará');
      }
    } catch {
      check('Certificado parseable', false);
    }
  }

  // Verificación 10: la clave de acceso en el XML es válida
  const keyMatch = xml.match(/<claveAcceso>(\d{49})<\/claveAcceso>/);
  if (keyMatch) {
    check('Clave de acceso con 49 dígitos', true);
    check('Módulo 11 correcto', validateMod11(keyMatch[1]));
  } else {
    check('Clave de acceso con 49 dígitos', false);
  }

  console.log('\n');
  console.log('━━━ Interpretación ━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Si todos los checks pasan y el SRI sigue rechazando');
  console.log('con error de firma, el problema es C14N:');
  console.log('');
  console.log('El SRI requiere canonicalización C14N del XML antes');
  console.log('de calcular el digest. Sin C14N, cualquier diferencia');
  console.log('de espacios o atributos cambia el hash y la firma falla.');
  console.log('');
  console.log('Solución: instalar xml-c14n y aplicar antes del digest:');
  console.log('  npm install xml-c14n');
  console.log('  const c14n = require("xml-c14n")();');
  console.log('  const canonicalized = await c14n.canonicalise(xml);');
  console.log('  // Luego calcular SHA1 del canonicalized');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function check(label: string, result: boolean) {
  const icon = result ? '✅' : '❌';
  console.log(`  ${icon} ${label}`);
}

function validateMod11(key: string): boolean {
  if (key.length !== 49) return false;
  const weights = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  const k = key.slice(0, 48);
  for (let i = k.length - 1; i >= 0; i--) {
    sum += parseInt(k[i], 10) * weights[(k.length - 1 - i) % weights.length];
  }
  const d = 11 - (sum % 11);
  const expected = d === 11 ? '0' : d === 10 ? '1' : String(d);
  return expected === key.slice(48);
}

diagnose();