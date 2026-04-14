// scripts/test-sri-flow.ts
// ✅ VERSIÓN QUE FUNCIONA — mismo enfoque que Python/lxml

import * as forge from 'node-forge';
import * as crypto from 'crypto';
import * as fs from 'fs';
import axios from 'axios';

const CONFIG = {
  p12Path: './certificado-pruebas.p12',
  p12Password: 'Fabricio7#',
  ruc: '1350135958001',
  razonSocial: 'ALEX FABRICIO ANCHUNDIA MERO',
  nombreComercial: 'NEXORA',
  direccion: 'ECUADOR',
  sriRecepcionUrl:
    'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
  sriAutorizacionUrl:
    'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
};

const DS       = 'http://www.w3.org/2000/09/xmldsig#';
const XADES    = 'http://uri.etsi.org/01903/v1.3.2#';
const XADES141 = 'http://uri.etsi.org/01903/v1.4.1#';

// ─── C14N manual usando node-forge ───────────────────────────────────────────
// Parsea un fragmento XML y devuelve su C14N canonicalizado
function c14n(xmlStr: string): Buffer {
  // Usar el canonicalizador de xml-crypto aplicado a un elemento parseado
  // @ts-ignore
  const { C14nCanonicalization } = require('xml-crypto');
  // @ts-ignore
  const { DOMParser } = require('@xmldom/xmldom');
  const doc = new DOMParser().parseFromString(xmlStr, 'text/xml');
  const result: string = new C14nCanonicalization().process(doc.documentElement);
  return Buffer.from(result, 'utf-8');
}

function sha256b64(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('base64');
}

// ─── Carga el .p12 ───────────────────────────────────────────────────────────
function loadP12(p12Path: string, password: string) {
  const buf = fs.readFileSync(p12Path);
  const p12 = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(forge.util.createBuffer(buf.toString('binary'))), password);

  // Clave privada [1] = digitalSignature
  const shroudedBags = p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })
    [forge.pki.oids.pkcs8ShroudedKeyBag]!;
  const signingKey = shroudedBags[1].key as forge.pki.rsa.PrivateKey;
  const privateKeyPem = forge.pki.privateKeyToPem(signingKey);

  // Cert [1] = digitalSignature (serial 65e81189)
  const certBags = p12.getBags({ bagType: forge.pki.oids.certBag })
    [forge.pki.oids.certBag]!;
  const signingCert = certBags[1].cert!;

  const certDer  = Buffer.from(forge.asn1.toDer(forge.pki.certificateToAsn1(signingCert)).getBytes(), 'binary');
  const certB64  = certDer.toString('base64');
  const certSha256 = crypto.createHash('sha256').update(certDer).digest('base64');

  // IssuerDN en orden inverso (como Java/BouncyCastle)
  const OID_SHORT: Record<string, string> = {
    '2.5.4.6': 'C', '2.5.4.10': 'O', '2.5.4.11': 'OU',
    '2.5.4.7': 'L', '2.5.4.3': 'CN', '2.5.4.5': 'SERIALNUMBER',
  };
  const issuerDN = signingCert.issuer.attributes
    .map((a: any) => `${OID_SHORT[a.type] ?? a.name}=${a.value}`)
    .reverse()
    .join(',');

  const serialDecimal = BigInt('0x' + signingCert.serialNumber).toString(10);
  const daysLeft = Math.floor((signingCert.validity.notAfter.getTime() - Date.now()) / 86400000);

  return { privateKeyPem, certB64, certSha256, issuerDN, serialDecimal,
           holderName: signingCert.subject.getField('CN')?.value ?? '', daysLeft };
}

// ─── Firma XAdES-BES ──────────────────────────────────────────────────────────
function buildSignedXml(xmlBody: string, p12: ReturnType<typeof loadP12>): string {
  const sigId   = `xmldsig-${crypto.randomUUID()}`;
  const spId    = `${sigId}-signedprops`;
  const refId   = `${sigId}-ref0`;
  const sigTime = new Date().toISOString();

  // 1. Digest del comprobante (C14N del XML sin firma)
  const compC14n    = c14n(xmlBody);
  const digestComp  = sha256b64(compC14n);

  // 2. SignedProperties con xmlns:xades141 y xmlns:ds explícitos
  //    (CRÍTICO: estos namespaces deben estar presentes al calcular el digest,
  //     igual que quedarán en el XML final dentro del QualifyingProperties)
  const spXml =
    `<xades:SignedProperties xmlns:xades="${XADES}" xmlns:xades141="${XADES141}" xmlns:ds="${DS}" Id="${spId}">` +
    `<xades:SignedSignatureProperties>` +
    `<xades:SigningTime>${sigTime}</xades:SigningTime>` +
    `<xades:SigningCertificate><xades:Cert>` +
    `<xades:CertDigest>` +
    `<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>` +
    `<ds:DigestValue>${p12.certSha256}</ds:DigestValue>` +
    `</xades:CertDigest>` +
    `<xades:IssuerSerial>` +
    `<ds:X509IssuerName>${p12.issuerDN}</ds:X509IssuerName>` +
    `<ds:X509SerialNumber>${p12.serialDecimal}</ds:X509SerialNumber>` +
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

  const digestSP = sha256b64(c14n(spXml));

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

  const siC14n = c14n(siXml);
  const sign   = crypto.createSign('RSA-SHA256');
  sign.update(siC14n);
  const sigValue = sign.sign(p12.privateKeyPem, 'base64');

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
    `<ds:X509Certificate>${p12.certB64}</ds:X509Certificate>` +
    `</ds:X509Data></ds:KeyInfo>` +
    `<ds:Object>${qpXml}</ds:Object>` +
    `</ds:Signature>`;

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    xmlBody.replace('</factura>', signature + '</factura>');
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function mod11(k: string): string {
  const w = [2,3,4,5,6,7];
  let s = 0;
  for (let i = k.length-1; i >= 0; i--) s += parseInt(k[i],10) * w[(k.length-1-i) % w.length];
  const d = 11 - (s % 11);
  return d===11 ? '0' : d===10 ? '1' : String(d);
}

function generateAccessKey(ruc: string): string {
  const now  = new Date();
  const dd   = String(now.getDate()).padStart(2,'0');
  const mm   = String(now.getMonth()+1).padStart(2,'0');
  const yyyy = String(now.getFullYear());
  const sec  = String(Date.now()).slice(-9).padStart(9,'0');
  const num  = String(Math.floor(Math.random()*99999999)).padStart(8,'0');
  const p    = `${dd}${mm}${yyyy}01${ruc}1001001${sec}${num}1`;
  return p + mod11(p);
}

function generateXmlBody(accessKey: string, cfg: typeof CONFIG): string {
  const now = new Date();
  const f   = `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
  const seq = accessKey.substring(30,39);
  return `<factura id="comprobante" version="2.1.0"><infoTributaria><ambiente>1</ambiente><tipoEmision>1</tipoEmision><razonSocial>${cfg.razonSocial}</razonSocial><nombreComercial>${cfg.nombreComercial}</nombreComercial><ruc>${cfg.ruc}</ruc><claveAcceso>${accessKey}</claveAcceso><codDoc>01</codDoc><estab>001</estab><ptoEmi>001</ptoEmi><secuencial>${seq}</secuencial><dirMatriz>${cfg.direccion}</dirMatriz></infoTributaria><infoFactura><fechaEmision>${f}</fechaEmision><dirEstablecimiento>${cfg.direccion}</dirEstablecimiento><obligadoContabilidad>NO</obligadoContabilidad><tipoIdentificacionComprador>05</tipoIdentificacionComprador><razonSocialComprador>CLIENTE PRUEBA</razonSocialComprador><identificacionComprador>1713175071</identificacionComprador><totalSinImpuestos>100.00</totalSinImpuestos><totalDescuento>0.00</totalDescuento><totalConImpuestos><totalImpuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><descuentoAdicional>0.00</descuentoAdicional><baseImponible>100.00</baseImponible><valor>15.00</valor></totalImpuesto></totalConImpuestos><propina>0.00</propina><importeTotal>115.00</importeTotal><moneda>DOLAR</moneda><pagos><pago><formaPago>01</formaPago><total>115.00</total></pago></pagos></infoFactura><detalles><detalle><codigoPrincipal>001</codigoPrincipal><descripcion>PRODUCTO PRUEBA NEXORA</descripcion><cantidad>1.000000</cantidad><precioUnitario>100.000000</precioUnitario><descuento>0.00</descuento><precioTotalSinImpuesto>100.00</precioTotalSinImpuesto><impuestos><impuesto><codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje><tarifa>15</tarifa><baseImponible>100.00</baseImponible><valor>15.00</valor></impuesto></impuestos></detalle></detalles><infoAdicional><campoAdicional nombre="email">fabricio@nexora.ec</campoAdicional></infoAdicional></factura>`;
}

async function submitToSri(signedXml: string, url: string) {
  const soap =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.recepcion">' +
    '<soap:Body><ec:validarComprobante>' +
    `<xml>${Buffer.from(signedXml,'utf-8').toString('base64')}</xml>` +
    '</ec:validarComprobante></soap:Body></soap:Envelope>';
  const res = await axios.post(url, soap,
    { headers: { 'Content-Type': 'text/xml; charset=utf-8' }, timeout: 30000 });
  const raw: string = res.data;
  return { state: raw.includes('<estado>RECIBIDA</estado>') ? 'RECIBIDA' : 'DEVUELTA',
           messages: extractMsgs(raw), rawXml: raw };
}

async function checkAuth(accessKey: string, url: string) {
  const soap =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ec="http://ec.gob.sri.ws.autorizacion">' +
    '<soap:Body><ec:autorizacionComprobante>' +
    `<claveAccesoComprobante>${accessKey}</claveAccesoComprobante>` +
    '</ec:autorizacionComprobante></soap:Body></soap:Envelope>';
  try {
    const res = await axios.post(url, soap,
      { headers: { 'Content-Type': 'text/xml; charset=utf-8' }, timeout: 30000 });
    const raw: string = res.data;
    let state: 'AUTORIZADO' | 'NO AUTORIZADO' | 'PPR' = 'PPR';
    if (raw.includes('<estado>AUTORIZADO</estado>')) state = 'AUTORIZADO';
    else if (raw.includes('RECHAZADO') || raw.includes('NO AUTORIZADO')) state = 'NO AUTORIZADO';
    return { state,
      authorizationNumber: raw.match(/<numeroAutorizacion>(\d+)<\/numeroAutorizacion>/)?.[1] ?? null,
      authorizedAt: raw.match(/<fechaAutorizacion>([^<]+)<\/fechaAutorizacion>/)?.[1] ?? null,
      messages: extractMsgs(raw), rawXml: raw };
  } catch {
    return { state: 'PPR' as const, authorizationNumber: null, authorizedAt: null, messages: [], rawXml: '' };
  }
}

function extractMsgs(xml: string) {
  const msgs: any[] = [];
  const br = /<mensajes>([\s\S]*?)<\/mensajes>/g;
  let bm: RegExpExecArray | null;
  while ((bm = br.exec(xml)) !== null) {
    const ir = /<mensaje>([\s\S]*?)<\/mensaje>/g;
    let im: RegExpExecArray | null;
    while ((im = ir.exec(bm[1])) !== null) {
      const m = im[1];
      msgs.push({
        identifier:     m.match(/<identificador>([^<]*)<\/identificador>/)?.[1] ?? '',
        message:        m.match(/<mensaje>([^<]*)<\/mensaje>/)?.[1] ?? '',
        additionalInfo: m.match(/<informacionAdicional>([^<]*)<\/informacionAdicional>/)?.[1] ?? '',
      });
    }
  }
  return msgs;
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🚀 Iniciando prueba SRI — TypeScript...\n');

  console.log('📋 PASO 1: Cargando certificado...');
  const p12 = loadP12(CONFIG.p12Path, CONFIG.p12Password);
  console.log(`   ✓ Titular: ${p12.holderName} (${p12.daysLeft} días)`);
  console.log(`   ✓ Serial: ${p12.serialDecimal}`);

  console.log('\n📋 PASO 2: Generando clave de acceso...');
  const accessKey = generateAccessKey(CONFIG.ruc);
  console.log(`   ✓ Clave: ${accessKey}`);

  console.log('\n📋 PASO 3: Generando XML...');
  if (!fs.existsSync('./test-output')) fs.mkdirSync('./test-output', { recursive: true });
  const xmlBody = generateXmlBody(accessKey, CONFIG);
  fs.writeFileSync('./test-output/factura-sin-firma.xml',
    '<?xml version="1.0" encoding="UTF-8"?>\n' + xmlBody, 'utf-8');
  console.log('   ✓ XML generado');

  console.log('\n📋 PASO 4: Firmando XML...');
  const signedXml = buildSignedXml(xmlBody, p12);
  fs.writeFileSync('./test-output/factura-firmada.xml', signedXml, 'utf-8');
  console.log('   ✓ XML firmado');

  console.log('\n📋 PASO 5: Enviando al SRI...');
  const reception = await submitToSri(signedXml, CONFIG.sriRecepcionUrl);
  console.log(`   Estado: ${reception.state}`);

  if (reception.state === 'DEVUELTA') {
    console.error('\n   ❌ DEVUELTA:');
    reception.messages.forEach((m: any) => {
      console.error(`      [${m.identifier}] ${m.message}`);
      if (m.additionalInfo) console.error(`      → ${m.additionalInfo}`);
    });
    fs.writeFileSync('./test-output/respuesta-recepcion.xml', reception.rawXml, 'utf-8');
    process.exit(1);
  }
  console.log('   ✓ SRI RECIBIÓ');

  console.log('\n📋 PASO 6: Consultando autorización (8s)...');
  await sleep(8000);
  let auth = await checkAuth(accessKey, CONFIG.sriAutorizacionUrl);
  let polls = 0;
  while (auth.state === 'PPR' && polls < 10) {
    polls++;
    console.log(`   PPR ${polls}/10...`);
    await sleep(8000);
    auth = await checkAuth(accessKey, CONFIG.sriAutorizacionUrl);
  }

  fs.writeFileSync('./test-output/respuesta-autorizacion.xml', auth.rawXml, 'utf-8');
  console.log('\n📋 PASO 7: Resultado...\n');

  if (auth.state === 'AUTORIZADO') {
    console.log('🎉🎉🎉 AUTORIZADO DESDE TYPESCRIPT 🎉🎉🎉');
    console.log('══════════════════════════════════════════════════');
    console.log(`   Número: ${auth.authorizationNumber}`);
    console.log(`   Fecha:  ${auth.authorizedAt}`);
    console.log(`   Clave:  ${accessKey}`);
    console.log('══════════════════════════════════════════════════\n');
  } else {
    console.error('❌ NO AUTORIZADO');
    auth.messages.forEach((m: any) => {
      console.error(`   [${m.identifier}] ${m.message}`);
      if (m.additionalInfo) console.error(`   → ${m.additionalInfo}`);
    });
    console.log('\n   → test-output/respuesta-autorizacion.xml');
  }
}

main().catch(err => { console.error('\n💥', err.message); process.exit(1); });