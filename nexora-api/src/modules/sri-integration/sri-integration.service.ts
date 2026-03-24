// src/modules/sri-integration/sri-integration.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { EnvironmentType } from '../../common/enums/environment-type.enum';

// ⚠️ PENDIENTE DE PARAMETRIZACIÓN CRÍTICA
// URLs de los servicios del SRI Ecuador.
// VERIFICAR las URLs actuales directamente con el SRI o en su documentación.
// Las URLs pueden cambiar con actualizaciones de la plataforma.
// Actualmente el SRI expone servicios SOAP (WSDL disponible en su portal).
const SRI_ENDPOINTS = {
  [EnvironmentType.PRUEBAS]: {
    reception: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    authorization: 'https://celcer.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
  [EnvironmentType.PRODUCCION]: {
    reception: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/RecepcionComprobantesOffline?wsdl',
    authorization: 'https://cel.sri.gob.ec/comprobantes-electronicos-ws/AutorizacionComprobantesOffline?wsdl',
  },
};

// ⚠️ Estados de respuesta del SRI — VERIFICAR con ficha técnica
export const SRI_RECEPTION_STATES = {
  RECEIVED: 'RECIBIDA',
  REJECTED: 'DEVUELTA',
} as const;

export const SRI_AUTHORIZATION_STATES = {
  AUTHORIZED: 'AUTORIZADO',
  NOT_AUTHORIZED: 'NO AUTORIZADO',
  IN_PROCESS: 'EN PROCESO',
} as const;

export interface SriReceptionResult {
  state: string;
  messages: SriMessage[];
  rawResponse: any;
}

export interface SriAuthorizationResult {
  state: string;
  authorizationNumber: string | null;
  authorizedAt: Date | null;
  messages: SriMessage[];
  rawResponse: any;
}

export interface SriMessage {
  identifier: string;
  message: string;
  additionalInfo: string;
  messageType: string; // ERROR | ADVERTENCIA — verificar con ficha técnica
}

@Injectable()
export class SriIntegrationService {
  private readonly logger = new Logger(SriIntegrationService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Recepción del comprobante ───────────────────────────────────────────────
  async submitDocument(
    signedXml: string,
    environment: EnvironmentType,
  ): Promise<SriReceptionResult> {
    const endpoint = SRI_ENDPOINTS[environment].reception;
    const xmlBase64 = Buffer.from(signedXml, 'utf-8').toString('base64');

    // ⚠️ El SRI usa servicios SOAP. La estructura del body SOAP
    // debe verificarse con el WSDL y la ficha técnica vigente.
    // Esta es la estructura base — confirmar nombres de operaciones y campos.
    const soapBody = this.buildReceptionSoapBody(xmlBase64);

    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoint, soapBody, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '', // ⚠️ Verificar SOAPAction requerido
          },
          timeout: 30000,
        }),
      );

      return this.parseReceptionResponse(response.data);
    } catch (error) {
      this.logger.error('Error en recepción SRI', error.message);

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('TIMEOUT: El SRI no respondió en el tiempo esperado');
      }
      if (error.response?.status >= 500) {
        throw new Error(`SRI_SERVER_ERROR: ${error.response.status}`);
      }

      throw new Error(`SRI_CONNECTION_ERROR: ${error.message}`);
    }
  }

  // ─── Consulta de autorización ────────────────────────────────────────────────
  async checkAuthorization(
    accessKey: string,
    environment: EnvironmentType,
  ): Promise<SriAuthorizationResult> {
    const endpoint = SRI_ENDPOINTS[environment].authorization;

    // ⚠️ Estructura SOAP de consulta — verificar con WSDL del SRI
    const soapBody = this.buildAuthorizationSoapBody(accessKey);

    try {
      const response = await firstValueFrom(
        this.httpService.post(endpoint, soapBody, {
          headers: {
            'Content-Type': 'text/xml; charset=utf-8',
            'SOAPAction': '',
          },
          timeout: 30000,
        }),
      );

      return this.parseAuthorizationResponse(response.data);
    } catch (error) {
      this.logger.error('Error consultando autorización SRI', error.message);

      if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        throw new Error('TIMEOUT: Consulta de autorización sin respuesta');
      }

      throw new Error(`SRI_QUERY_ERROR: ${error.message}`);
    }
  }

  // ─── Construcción SOAP ──────────────────────────────────────────────────────
  // ⚠️ PENDIENTE DE PARAMETRIZACIÓN
  // Los envelopes SOAP deben verificarse contra el WSDL actual del SRI.
  // Los nombres de operaciones, parámetros y namespaces pueden cambiar.

  private buildReceptionSoapBody(xmlBase64: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ec="http://ec.gob.sri.ws.recepcion">
  <soap:Body>
    <ec:validarComprobante>
      <xml>${xmlBase64}</xml>
    </ec:validarComprobante>
  </soap:Body>
</soap:Envelope>`;
  }

  private buildAuthorizationSoapBody(accessKey: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:ec="http://ec.gob.sri.ws.autorizacion">
  <soap:Body>
    <ec:autorizacionComprobante>
      <claveAccesoComprobante>${accessKey}</claveAccesoComprobante>
    </ec:autorizacionComprobante>
  </soap:Body>
</soap:Envelope>`;
  }

  // ─── Parseo de respuestas ────────────────────────────────────────────────────
  // ⚠️ Los nodos XML de respuesta deben verificarse con ejemplos reales del SRI.
  // Usar una librería como fast-xml-parser para parsear el SOAP response.

  private parseReceptionResponse(rawXml: string): SriReceptionResult {
    // ⚠️ IMPLEMENTACIÓN SIMPLIFICADA
    // La extracción real de campos del XML SOAP response
    // debe hacerse con fast-xml-parser o xml2js verificando
    // los nodos exactos que devuelve el SRI.
    this.logger.debug('SRI reception raw response:', rawXml.substring(0, 500));

    const isReceived = rawXml.includes('RECIBIDA');
    const isRejected = rawXml.includes('DEVUELTA');

    return {
      state: isReceived
        ? SRI_RECEPTION_STATES.RECEIVED
        : isRejected
          ? SRI_RECEPTION_STATES.REJECTED
          : 'UNKNOWN',
      messages: this.extractMessages(rawXml),
      rawResponse: { xml: rawXml },
    };
  }

  private parseAuthorizationResponse(rawXml: string): SriAuthorizationResult {
    // ⚠️ IMPLEMENTACIÓN SIMPLIFICADA
    // Parsear el XML real con la librería adecuada verificando
    // los campos exactos del SRI.
    this.logger.debug('SRI auth raw response:', rawXml.substring(0, 500));

    const isAuthorized = rawXml.includes('AUTORIZADO');
    const inProcess = rawXml.includes('EN PROCESO');

    // ⚠️ Extraer número de autorización del XML — verificar con ficha técnica
    const authNumberMatch = rawXml.match(/<numeroAutorizacion>(\d+)<\/numeroAutorizacion>/);
    const authDateMatch = rawXml.match(/<fechaAutorizacion>([^<]+)<\/fechaAutorizacion>/);

    return {
      state: isAuthorized
        ? SRI_AUTHORIZATION_STATES.AUTHORIZED
        : inProcess
          ? SRI_AUTHORIZATION_STATES.IN_PROCESS
          : SRI_AUTHORIZATION_STATES.NOT_AUTHORIZED,
      authorizationNumber: authNumberMatch?.[1] ?? null,
      authorizedAt: authDateMatch
        ? new Date(authDateMatch[1])
        : null,
      messages: this.extractMessages(rawXml),
      rawResponse: { xml: rawXml },
    };
  }

  private extractMessages(rawXml: string): SriMessage[] {
    // ⚠️ PENDIENTE — parsear mensajes de error reales del SRI
    // Los mensajes de error/advertencia están en nodos específicos del XML
    // verificar estructura con ficha técnica y ejemplos reales
    const messages: SriMessage[] = [];

    const messageRegex =
      /<mensaje>([^<]*)<\/mensaje>.*?<informacionAdicional>([^<]*)<\/informacionAdicional>/gs;
    const matches = [...rawXml.matchAll(messageRegex)];

    for (const match of matches) {
      messages.push({
        identifier: 'SRI_MSG',
        message: match[1] ?? '',
        additionalInfo: match[2] ?? '',
        messageType: rawXml.includes('ERROR') ? 'ERROR' : 'ADVERTENCIA',
      });
    }

    return messages;
  }
}