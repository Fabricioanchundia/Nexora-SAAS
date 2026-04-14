#!/usr/bin/env python3
# scripts/firmar-y-enviar.py
# Requiere: pip install lxml cryptography
# Requiere: ./signing-key.pem (generado con Node.js)

import base64, hashlib, uuid, random, sys, os, time, re
from datetime import datetime, timezone
from lxml import etree
from cryptography.hazmat.primitives.serialization import pkcs12, Encoding, load_pem_private_key
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes
import urllib.request

P12_PATH  = './certificado-pruebas.p12'
P12_PASS  = 'Fabricio7#'
KEY_PEM   = './signing-key.pem'
RUC       = '1350135958001'
RAZON     = 'ALEX FABRICIO ANCHUNDIA MERO'
COMERCIAL = 'NEXORA'
DIRECCION = 'ECUADOR'
URL_RECEP = 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline'
URL_AUTH  = 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline'

DS       = 'http://www.w3.org/2000/09/xmldsig#'
XADES    = 'http://uri.etsi.org/01903/v1.3.2#'
XADES141 = 'http://uri.etsi.org/01903/v1.4.1#'

OID_SHORT_NAMES = {
    '2.5.4.6':  'C',
    '2.5.4.10': 'O',
    '2.5.4.11': 'OU',
    '2.5.4.7':  'L',
    '2.5.4.3':  'CN',
    '2.5.4.5':  'SERIALNUMBER',
}

def _build_issuer_dn(cert):
    # El SRI espera el IssuerDN en orden INVERSO (como lo serializa Java/BouncyCastle)
    parts = []
    for a in cert.issuer:
        short = OID_SHORT_NAMES.get(a.oid.dotted_string, a.oid._name)
        parts.append(f"{short}={a.value}")
    return ','.join(reversed(parts))

def load_p12():
    # Cargar la clave privada de firma digital (extraída previamente por Node.js)
    with open(KEY_PEM, 'rb') as f:
        private_key = load_pem_private_key(f.read(), password=None, backend=default_backend())

    # Cargar el certificado de firma digital del .p12
    with open(P12_PATH, 'rb') as f:
        data = f.read()
    _, _, chain = pkcs12.load_key_and_certificates(data, P12_PASS.encode(), default_backend())
    signing_cert = chain[0]  # serial 65e81189 (digitalSignature)

    cert_der = signing_cert.public_bytes(Encoding.DER)
    days_left = (signing_cert.not_valid_after_utc - datetime.now(timezone.utc)).days
    return {
        'private_key': private_key,
        'cert': signing_cert,
        'cert_b64':    base64.b64encode(cert_der).decode(),
        'cert_sha256': base64.b64encode(hashlib.sha256(cert_der).digest()).decode(),
        'issuer_dn':   _build_issuer_dn(signing_cert),
        'serial':      str(signing_cert.serial_number),
        'days_left':   days_left,
    }

def mod11(k):
    w = [2,3,4,5,6,7]
    s = sum(int(c)*w[i%len(w)] for i,c in enumerate(reversed(k)))
    d = 11-(s%11)
    return '0' if d==11 else '1' if d==10 else str(d)

def gen_access_key():
    now = datetime.now()
    dd,mm,yyyy = now.strftime('%d'),now.strftime('%m'),now.strftime('%Y')
    sec = str(int(datetime.now().timestamp()*1000))[-9:]
    num = str(random.randint(0,99999999)).zfill(8)
    p = f"{dd}{mm}{yyyy}01{RUC}1001001{sec}{num}1"
    return p + mod11(p)

def sign_xml(xml_body: str, p12: dict) -> str:
    sig_uuid     = str(uuid.uuid4())
    sig_id       = f'xmldsig-{sig_uuid}'
    sp_id        = f'{sig_id}-signedprops'
    ref_id       = f'{sig_id}-ref0'
    signing_time = datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'

    # Digest del comprobante con C14N
    root = etree.fromstring(xml_body.encode('utf-8'))
    root_c14n = etree.tostring(root, method='c14n')
    digest_comprobante = base64.b64encode(hashlib.sha256(root_c14n).digest()).decode()

    # SignedProperties y su digest con C14N
    sp_xml = (
        f'<xades:SignedProperties xmlns:xades="{XADES}" xmlns:xades141="{XADES141}" xmlns:ds="{DS}" Id="{sp_id}">'
        f'<xades:SignedSignatureProperties>'
        f'<xades:SigningTime>{signing_time}</xades:SigningTime>'
        f'<xades:SigningCertificate><xades:Cert>'
        f'<xades:CertDigest>'
        f'<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>'
        f'<ds:DigestValue>{p12["cert_sha256"]}</ds:DigestValue>'
        f'</xades:CertDigest>'
        f'<xades:IssuerSerial>'
        f'<ds:X509IssuerName>{p12["issuer_dn"]}</ds:X509IssuerName>'
        f'<ds:X509SerialNumber>{p12["serial"]}</ds:X509SerialNumber>'
        f'</xades:IssuerSerial>'
        f'</xades:Cert></xades:SigningCertificate>'
        f'</xades:SignedSignatureProperties>'
        f'<xades:SignedDataObjectProperties>'
        f'<xades:DataObjectFormat ObjectReference="#{ref_id}">'
        f'<xades:Description>FIRMA DIGITAL SRI</xades:Description>'
        f'<xades:MimeType>text/xml</xades:MimeType>'
        f'<xades:Encoding>UTF-8</xades:Encoding>'
        f'</xades:DataObjectFormat>'
        f'</xades:SignedDataObjectProperties>'
        f'</xades:SignedProperties>'
    )
    sp_el = etree.fromstring(sp_xml.encode('utf-8'))
    sp_c14n = etree.tostring(sp_el, method='c14n')
    digest_sp = base64.b64encode(hashlib.sha256(sp_c14n).digest()).decode()

    # SignedInfo
    si_xml = (
        f'<ds:SignedInfo xmlns:ds="{DS}">'
        f'<ds:CanonicalizationMethod Algorithm="http://www.w3.org/TR/2001/REC-xml-c14n-20010315"/>'
        f'<ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>'
        f'<ds:Reference Id="{ref_id}" URI="#comprobante">'
        f'<ds:Transforms><ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/></ds:Transforms>'
        f'<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>'
        f'<ds:DigestValue>{digest_comprobante}</ds:DigestValue>'
        f'</ds:Reference>'
        f'<ds:Reference Type="http://uri.etsi.org/01903#SignedProperties" URI="#{sp_id}">'
        f'<ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>'
        f'<ds:DigestValue>{digest_sp}</ds:DigestValue>'
        f'</ds:Reference>'
        f'</ds:SignedInfo>'
    )
    si_el = etree.fromstring(si_xml.encode('utf-8'))
    si_c14n = etree.tostring(si_el, method='c14n')

    # Firmar con RSA-SHA256
    sig_bytes = p12['private_key'].sign(si_c14n, padding.PKCS1v15(), hashes.SHA256())
    sig_b64   = base64.b64encode(sig_bytes).decode()

    # Ensamblar XML firmado
    qp_xml = (
        f'<xades:QualifyingProperties xmlns:xades="{XADES}" xmlns:xades141="{XADES141}" Target="#{sig_id}">'
        f'{sp_xml}'
        f'</xades:QualifyingProperties>'
    )
    final_sig = (
        f'<ds:Signature xmlns:ds="{DS}" Id="{sig_id}">'
        f'{si_xml}'
        f'<ds:SignatureValue Id="{sig_id}-sigvalue">{sig_b64}</ds:SignatureValue>'
        f'<ds:KeyInfo><ds:X509Data>'
        f'<ds:X509Certificate>{p12["cert_b64"]}</ds:X509Certificate>'
        f'</ds:X509Data></ds:KeyInfo>'
        f'<ds:Object>{qp_xml}</ds:Object>'
        f'</ds:Signature>'
    )
    return xml_body.replace('</factura>', final_sig + '</factura>')

def gen_xml(access_key: str) -> str:
    now = datetime.now()
    dd,mm,yyyy = now.strftime('%d'),now.strftime('%m'),now.strftime('%Y')
    seq = access_key[30:39]
    return (
        f'<factura id="comprobante" version="2.1.0">'
        f'<infoTributaria><ambiente>1</ambiente><tipoEmision>1</tipoEmision>'
        f'<razonSocial>{RAZON}</razonSocial><nombreComercial>{COMERCIAL}</nombreComercial>'
        f'<ruc>{RUC}</ruc><claveAcceso>{access_key}</claveAcceso>'
        f'<codDoc>01</codDoc><estab>001</estab><ptoEmi>001</ptoEmi>'
        f'<secuencial>{seq}</secuencial><dirMatriz>{DIRECCION}</dirMatriz>'
        f'</infoTributaria>'
        f'<infoFactura><fechaEmision>{dd}/{mm}/{yyyy}</fechaEmision>'
        f'<dirEstablecimiento>{DIRECCION}</dirEstablecimiento>'
        f'<obligadoContabilidad>NO</obligadoContabilidad>'
        f'<tipoIdentificacionComprador>05</tipoIdentificacionComprador>'
        f'<razonSocialComprador>CLIENTE PRUEBA</razonSocialComprador>'
        f'<identificacionComprador>1713175071</identificacionComprador>'
        f'<totalSinImpuestos>100.00</totalSinImpuestos><totalDescuento>0.00</totalDescuento>'
        f'<totalConImpuestos><totalImpuesto>'
        f'<codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje>'
        f'<descuentoAdicional>0.00</descuentoAdicional>'
        f'<baseImponible>100.00</baseImponible><valor>15.00</valor>'
        f'</totalImpuesto></totalConImpuestos>'
        f'<propina>0.00</propina><importeTotal>115.00</importeTotal><moneda>DOLAR</moneda>'
        f'<pagos><pago><formaPago>01</formaPago><total>115.00</total></pago></pagos>'
        f'</infoFactura>'
        f'<detalles><detalle>'
        f'<codigoPrincipal>001</codigoPrincipal><descripcion>PRODUCTO PRUEBA NEXORA</descripcion>'
        f'<cantidad>1.000000</cantidad><precioUnitario>100.000000</precioUnitario>'
        f'<descuento>0.00</descuento><precioTotalSinImpuesto>100.00</precioTotalSinImpuesto>'
        f'<impuestos><impuesto>'
        f'<codigo>2</codigo><codigoPorcentaje>4</codigoPorcentaje>'
        f'<tarifa>15</tarifa><baseImponible>100.00</baseImponible><valor>15.00</valor>'
        f'</impuesto></impuestos>'
        f'</detalle></detalles>'
        f'<infoAdicional>'
        f'<campoAdicional nombre="email">fabricio@nexora.ec</campoAdicional>'
        f'</infoAdicional>'
        f'</factura>'
    )

def soap_post(url, body):
    req = urllib.request.Request(url, data=body.encode('utf-8'),
        headers={'Content-Type': 'text/xml; charset=utf-8'})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read().decode('utf-8')

def main():
    print('\n🚀 Iniciando prueba SRI — Python/lxml C14N...\n')

    print('📋 PASO 1: Cargando certificado...')
    p12 = load_p12()
    from cryptography import x509
    cn = p12['cert'].subject.get_attributes_for_oid(x509.NameOID.COMMON_NAME)[0].value
    print(f'   ✓ Titular: {cn} ({p12["days_left"]} días)')

    print('\n📋 PASO 2: Generando clave de acceso...')
    access_key = gen_access_key()
    print(f'   ✓ Clave: {access_key}')

    print('\n📋 PASO 3: Generando XML...')
    os.makedirs('test-output', exist_ok=True)
    xml_body = gen_xml(access_key)
    with open('test-output/factura-sin-firma.xml', 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n' + xml_body)
    print('   ✓ XML generado')

    print('\n📋 PASO 4: Firmando XML...')
    signed_body = sign_xml(xml_body, p12)
    signed_full = '<?xml version="1.0" encoding="UTF-8"?>\n' + signed_body
    with open('test-output/factura-firmada.xml', 'w', encoding='utf-8') as f:
        f.write(signed_full)
    print('   ✓ XML firmado')

    print('\n📋 PASO 5: Enviando al SRI...')
    xml_b64 = base64.b64encode(signed_full.encode('utf-8')).decode()
    soap = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" '
        'xmlns:ec="http://ec.gob.sri.ws.recepcion">'
        '<soap:Body><ec:validarComprobante>'
        f'<xml>{xml_b64}</xml>'
        '</ec:validarComprobante></soap:Body></soap:Envelope>'
    )
    resp = soap_post(URL_RECEP, soap)
    state = 'RECIBIDA' if '<estado>RECIBIDA</estado>' in resp else 'DEVUELTA'
    print(f'   Estado: {state}')

    if state == 'DEVUELTA':
        ids   = re.findall(r'<identificador>(.*?)</identificador>', resp)
        infos = re.findall(r'<informacionAdicional>(.*?)</informacionAdicional>', resp)
        print('   ❌ DEVUELTA:')
        for i,id_ in enumerate(ids):
            print(f'      [{id_}] → {infos[i] if i<len(infos) else ""}')
        with open('test-output/respuesta-recepcion.xml','w') as f: f.write(resp)
        sys.exit(1)
    print('   ✓ SRI RECIBIÓ')

    print('\n📋 PASO 6: Consultando autorización (8s)...')
    time.sleep(8)
    soap_auth = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" '
        'xmlns:ec="http://ec.gob.sri.ws.autorizacion">'
        '<soap:Body><ec:autorizacionComprobante>'
        f'<claveAccesoComprobante>{access_key}</claveAccesoComprobante>'
        '</ec:autorizacionComprobante></soap:Body></soap:Envelope>'
    )
    auth_resp = soap_post(URL_AUTH, soap_auth)
    polls = 0
    while ('<estado>AUTORIZADO</estado>' not in auth_resp
           and 'RECHAZADO' not in auth_resp and polls < 10):
        polls += 1
        print(f'   PPR {polls}/10...')
        time.sleep(8)
        auth_resp = soap_post(URL_AUTH, soap_auth)

    with open('test-output/respuesta-autorizacion.xml','w') as f: f.write(auth_resp)
    print('\n📋 PASO 7: Resultado...\n')

    if '<estado>AUTORIZADO</estado>' in auth_resp:
        num   = re.search(r'<numeroAutorizacion>(\d+)</numeroAutorizacion>', auth_resp)
        fecha = re.search(r'<fechaAutorizacion>([^<]+)</fechaAutorizacion>', auth_resp)
        print('🎉🎉🎉 PRIMER COMPROBANTE AUTORIZADO DESDE NEXORA 🎉🎉🎉')
        print('══════════════════════════════════════════════════')
        print(f'   Número: {num.group(1) if num else "N/A"}')
        print(f'   Fecha:  {fecha.group(1) if fecha else "N/A"}')
        print(f'   Clave:  {access_key}')
        print('══════════════════════════════════════════════════\n')
    else:
        ids   = re.findall(r'<identificador>(.*?)</identificador>', auth_resp)
        infos = re.findall(r'<informacionAdicional>(.*?)</informacionAdicional>', auth_resp)
        print('❌ NO AUTORIZADO')
        for i,id_ in enumerate(ids):
            print(f'   [{id_}] → {infos[i] if i<len(infos) else ""}')
        print('\n   → test-output/respuesta-autorizacion.xml')

if __name__ == '__main__':
    main()