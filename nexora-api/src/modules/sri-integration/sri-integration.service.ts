import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import { EnvironmentType } from '../../common/enums/environment-type.enum';
import {
  SriConnectionError,
  SriTimeoutError,
  toErrorMessage,
} from '../../common/errors/nexora.errors';

const ENDPOINTS: Record<EnvironmentType, { reception: string; authorization: string }> = {
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

export interface SriMessage {
  identifier: string;
  message: string;
  additionalInfo: string;
  type: 'ERROR' | 'ADVERTENCIA' | 'INFORMATIVO';
}

export type SriReceptionState = 'RECIBIDA' | 'DEVUELTA';
export type SriAuthorizationState = 'AUTORIZADO' | 'NO AUTORIZADO' | 'PPR';

export interface SriReceptionResult {
  state: SriReceptionState;
  messages: SriMessage[];
  rawXml: string;
}

export interface SriAuthorizationResult {
  state: SriAuthorizationState;
  authorizationNumber: string | null;
  authorizedAt: Date | null;
  environment: string | null;
  messages: SriMessage[];
  rawXml: string;
}

const TIMEOUT_MS = 30_000;

@Injectable()
export class SriIntegrationService {
  private readonly logger = new Logger(SriIntegrationService.name);

  private readonly xmlParser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    transformTagName: (tag: string) => tag.split(':').pop() ?? tag,
    trimValues: true,
    cdataPropName: '#cdata',
    parseTagValue: false,
    parseAttributeValue: false,
    isArray: (tagName: string) =>
      ['mensaje', 'comprobante', 'autorizacion'].includes(tagName),
  });

  constructor(private readonly http: HttpService) {}

  async submitDocument(
    signedXml: string,
    env: EnvironmentType,
  ): Promise<SriReceptionResult> {
    const url = ENDPOINTS[env].reception;
    const xmlBase64 = Buffer.from(signedXml, 'utf-8').toString('base64');
    const soap = this.buildReceptionSoap(xmlBase64);
    this.logger.debug(`SRI submitDocument [${env}]`);
    const rawXml = await this.postSoap(url, soap);
    return this.parseReception(rawXml);
  }

  async checkAuthorization(
    accessKey: string,
    env: EnvironmentType,
  ): Promise<SriAuthorizationResult> {
    const url = ENDPOINTS[env].authorization;
    const soap = this.buildAuthorizationSoap(accessKey);
    this.logger.debug(`SRI checkAuthorization [${env}]`);
    const rawXml = await this.postSoap(url, soap);
    return this.parseAuthorization(rawXml);
  }

  private async postSoap(url: string, body: string): Promise<string> {
    try {
      const res = await firstValueFrom(
        this.http
          .post<string>(url, body, {
            headers: { 'Content-Type': 'text/xml; charset=utf-8' },
            responseType: 'text',
          })
          .pipe(timeout(TIMEOUT_MS)),
      );
      return res.data;
    } catch (err) {
      const msg = toErrorMessage(err);
      if (
        msg.includes('timeout') ||
        msg.includes('ETIMEDOUT') ||
        msg.includes('ECONNABORTED')
      ) {
        throw new SriTimeoutError();
      }
      throw new SriConnectionError(msg);
    }
  }

  private parseReception(rawXml: string): SriReceptionResult {
    const safe = rawXml.substring(0, 4000);

    let root: unknown;
    try {
      root = this.xmlParser.parse(rawXml);
    } catch (err) {
      this.logger.error('Error parseando XML recepción', toErrorMessage(err));
      return {
        state: 'DEVUELTA',
        messages: [{
          identifier: 'PARSE_ERROR',
          message: 'No se pudo parsear la respuesta del SRI',
          additionalInfo: safe,
          type: 'ERROR',
        }],
        rawXml: safe,
      };
    }

    const respuesta = this.nav(
      root,
      'Envelope', 'Body',
      'validarComprobanteResponse',
      'RespuestaRecepcionComprobante',
    );

    if (!respuesta) {
      this.logger.warn('Respuesta de recepción con estructura inesperada');
      return { state: 'DEVUELTA', messages: [], rawXml: safe };
    }

    const estado = this.str(respuesta, 'estado');
    const state: SriReceptionState = estado === 'RECIBIDA' ? 'RECIBIDA' : 'DEVUELTA';
    const messages = this.extractReceptionMessages(respuesta);

    return { state, messages, rawXml: safe };
  }

  private parseAuthorization(rawXml: string): SriAuthorizationResult {
    const safe = rawXml.substring(0, 4000);

    let root: unknown;
    try {
      root = this.xmlParser.parse(rawXml);
    } catch (err) {
      this.logger.error('Error parseando XML autorización', toErrorMessage(err));
      return {
        state: 'PPR',
        authorizationNumber: null,
        authorizedAt: null,
        environment: null,
        messages: [],
        rawXml: safe,
      };
    }

    const respuesta = this.nav(
      root,
      'Envelope', 'Body',
      'autorizacionComprobanteResponse',
      'RespuestaAutorizacionComprobante',
    );

    if (!respuesta) {
      this.logger.warn('Respuesta de autorización con estructura inesperada');
      return {
        state: 'PPR',
        authorizationNumber: null,
        authorizedAt: null,
        environment: null,
        messages: [],
        rawXml: safe,
      };
    }

    const autorizaciones = this.arr(
      this.nav(respuesta, 'autorizaciones', 'autorizacion'),
    );
    const auth = autorizaciones[0];

    if (!auth) {
      return {
        state: 'PPR',
        authorizationNumber: null,
        authorizedAt: null,
        environment: null,
        messages: [],
        rawXml: safe,
      };
    }

    const estadoRaw = this.str(auth, 'estado') ?? '';
    let state: SriAuthorizationState;
    if (estadoRaw === 'AUTORIZADO') {
      state = 'AUTORIZADO';
    } else if (estadoRaw === 'PPR' || estadoRaw === '') {
      state = 'PPR';
    } else {
      state = 'NO AUTORIZADO';
    }

    const authNumber = this.str(auth, 'numeroAutorizacion') ?? null;

    const fechaStr = this.str(auth, 'fechaAutorizacion');
    let authorizedAt: Date | null = null;
    if (fechaStr) {
      const d = new Date(fechaStr);
      // ← corregido: usar Number.isNaN en vez de isNaN (sonarqube S7773)
      authorizedAt = Number.isNaN(d.getTime()) ? null : d;
    }

    const environment = this.str(auth, 'ambiente') ?? null;
    const messages = this.arr(
      this.nav(auth, 'mensajes', 'mensaje'),
    ).map((m) => this.normalizeMessage(m));

    return {
      state,
      authorizationNumber: authNumber,
      authorizedAt,
      environment,
      messages,
      rawXml: safe,
    };
  }

  private extractReceptionMessages(respuesta: unknown): SriMessage[] {
    const comprobantes = this.arr(
      this.nav(respuesta, 'comprobantes', 'comprobante'),
    );
    const messages: SriMessage[] = [];
    for (const comp of comprobantes) {
      const msgs = this.arr(this.nav(comp, 'mensajes', 'mensaje'));
      messages.push(...msgs.map((m) => this.normalizeMessage(m)));
    }
    return messages;
  }

  private normalizeMessage(raw: unknown): SriMessage {
    if (!raw || typeof raw !== 'object') {
      return {
        identifier: '',
        // ← corregido: cast explícito en vez de ?? ''  (evita S6551)
        message: typeof raw === 'string' ? raw : '',
        additionalInfo: '',
        type: 'ERROR',
      };
    }
    const m = raw as Record<string, unknown>;
    const tipoRaw = (typeof m['tipo'] === 'string' ? m['tipo'] : '').toUpperCase();
    let type: SriMessage['type'] = 'ERROR';
    if (tipoRaw === 'ADVERTENCIA') type = 'ADVERTENCIA';
    else if (tipoRaw === 'INFORMATIVO') type = 'INFORMATIVO';

    return {
      // ← corregido: cast tipado en vez de String() con ?? '' (evita S6551)
      identifier: typeof m['identificador'] === 'string' ? m['identificador'] : '',
      message: typeof m['mensaje'] === 'string' ? m['mensaje'] : '',
      additionalInfo:
        typeof m['informacionAdicional'] === 'string'
          ? m['informacionAdicional']
          : '',
      type,
    };
  }

  // ─── Helpers de navegación ────────────────────────────────────────────────

  private nav(obj: unknown, ...keys: string[]): unknown {
    let cur = obj;
    for (const k of keys) {
      if (cur == null || typeof cur !== 'object') return undefined;
      cur = (cur as Record<string, unknown>)[k];
    }
    return cur;
  }

  private str(obj: unknown, key: string): string | undefined {
    if (!obj || typeof obj !== 'object') return undefined;
    const v = (obj as Record<string, unknown>)[key];
    if (v == null) return undefined;
    // CDATA viene como objeto con propiedad #cdata
    if (typeof v === 'object' && '#cdata' in (v as object)) {
      const cdata = (v as Record<string, unknown>)['#cdata'];
      return typeof cdata === 'string' ? cdata.trim() : undefined;
    }
    return typeof v === 'string' ? v.trim() : String(v).trim();
  }

  private arr(val: unknown): unknown[] {
    if (!val) return [];
    if (Array.isArray(val)) return val;
    return [val];
  }

  // ─── Envelopes SOAP ───────────────────────────────────────────────────────

  private buildReceptionSoap(xmlBase64: string): string {
    return (
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
      ' xmlns:ec="http://ec.gob.sri.ws.recepcion">' +
      '<soap:Body>' +
      '<ec:validarComprobante>' +
      `<xml>${xmlBase64}</xml>` +
      '</ec:validarComprobante>' +
      '</soap:Body>' +
      '</soap:Envelope>'
    );
  }

  private buildAuthorizationSoap(accessKey: string): string {
    return (
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"' +
      ' xmlns:ec="http://ec.gob.sri.ws.autorizacion">' +
      '<soap:Body>' +
      '<ec:autorizacionComprobante>' +
      `<claveAccesoComprobante>${accessKey}</claveAccesoComprobante>` +
      '</ec:autorizacionComprobante>' +
      '</soap:Body>' +
      '</soap:Envelope>'
    );
  }
}