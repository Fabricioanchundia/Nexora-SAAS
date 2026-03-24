import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { EnvironmentType } from '../../common/enums/environment-type.enum';

// ⚠️ PENDIENTE — verificar URLs y estructura SOAP con el SRI Ecuador
const ENDPOINTS: Record<string, { reception: string; authorization: string }> = {
  [EnvironmentType.PRUEBAS]: {
    reception:
      'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
    authorization:
      'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
  },
  [EnvironmentType.PRODUCCION]: {
    reception:
      'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline',
    authorization:
      'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline',
  },
};

@Injectable()
export class SriIntegrationService {
  private readonly logger = new Logger(SriIntegrationService.name);

  constructor(private readonly http: HttpService) {}

  async submitDocument(signedXml: string, env: EnvironmentType) {
    const url = ENDPOINTS[env]?.reception;
    if (!url) throw new Error(`Ambiente SRI inválido: ${env}`);

    const xmlB64 = Buffer.from(signedXml, 'utf-8').toString('base64');
    // ⚠️ Estructura SOAP — verificar con WSDL del SRI
    const body =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
      'xmlns:ec="http://ec.gob.sri.ws.recepcion">' +
      '<soap:Body><ec:validarComprobante>' +
      `<xml>${xmlB64}</xml>` +
      '</ec:validarComprobante></soap:Body></soap:Envelope>';

    try {
      const res = await firstValueFrom(
        this.http.post(url, body, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          timeout: 30000,
        }),
      );
      return this.parseReception(res.data);
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        throw new Error('TIMEOUT: El SRI no respondió en tiempo');
      }
      throw new Error(`SRI_ERROR: ${err.message}`);
    }
  }

  async checkAuthorization(accessKey: string, env: EnvironmentType) {
    const url = ENDPOINTS[env]?.authorization;
    if (!url) throw new Error(`Ambiente SRI inválido: ${env}`);

    const body =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" ' +
      'xmlns:ec="http://ec.gob.sri.ws.autorizacion">' +
      '<soap:Body><ec:autorizacionComprobante>' +
      `<claveAccesoComprobante>${accessKey}</claveAccesoComprobante>` +
      '</ec:autorizacionComprobante></soap:Body></soap:Envelope>';

    try {
      const res = await firstValueFrom(
        this.http.post(url, body, {
          headers: { 'Content-Type': 'text/xml; charset=utf-8' },
          timeout: 30000,
        }),
      );
      return this.parseAuthorization(res.data);
    } catch (err) {
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        throw new Error('TIMEOUT: consulta autorización');
      }
      throw new Error(`SRI_QUERY_ERROR: ${err.message}`);
    }
  }

  private parseReception(xml: string) {
    this.logger.debug('SRI reception (300):', xml?.substring(0, 300));
    return {
      state: xml?.includes('RECIBIDA') ? 'RECIBIDA' : 'DEVUELTA',
      messages: this.extractMessages(xml),
      rawResponse: { xml },
    };
  }

  private parseAuthorization(xml: string) {
    this.logger.debug('SRI auth (300):', xml?.substring(0, 300));
    const numMatch = xml?.match(/<numeroAutorizacion>(\d+)<\/numeroAutorizacion>/);
    const dateMatch = xml?.match(/<fechaAutorizacion>([^<]+)<\/fechaAutorizacion>/);
    return {
      state: xml?.includes('AUTORIZADO')
        ? 'AUTORIZADO'
        : xml?.includes('EN PROCESO')
        ? 'EN PROCESO'
        : 'NO AUTORIZADO',
      authorizationNumber: numMatch?.[1] ?? null,
      authorizedAt: dateMatch ? new Date(dateMatch[1]) : null,
      messages: this.extractMessages(xml),
      rawResponse: { xml },
    };
  }

  private extractMessages(xml: string) {
    const msgs: any[] = [];
    const re = /<mensaje>([^<]*)<\/mensaje>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(xml ?? '')) !== null) {
      msgs.push({
        message: m[1],
        messageType: xml.includes('ERROR') ? 'ERROR' : 'ADVERTENCIA',
      });
    }
    return msgs;
  }
}