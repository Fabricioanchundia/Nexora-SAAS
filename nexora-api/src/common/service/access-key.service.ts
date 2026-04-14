// CAMBIO DE UBICACIÓN: antes en src/modules/invoices/access-key.service.ts
//
// Por qué: la clave de acceso es un concepto TRIBUTARIO, no de factura.
// TaxDocument la almacena, InvoicesService la genera, SriIntegration la usa.
// Pertenece a common/ como servicio compartido, no a un módulo específico.
//
// IMPACTO: actualizar las importaciones en:
// - invoices.service.ts  → import desde '../../common/services/access-key.service'
// - invoices.module.ts   → ya no provee AccessKeyService, lo importa de CommonModule
//
// Algoritmo módulo 11 — confirmado ficha técnica SRI Ecuador v2.26, sección 5.2

import { Injectable, Logger } from '@nestjs/common';
import {
  DocumentType,
  SriEnvironment,
  EmissionType,
} from '../../config/sri-config';

export interface AccessKeyParams {
  issueDate: Date;
  documentType: DocumentType;    // tipo de comprobante — Tabla 3
  ruc: string;                   // 13 dígitos
  environment: SriEnvironment | string;
  establishmentCode: string;     // 3 dígitos
  emissionPoint: string;         // 3 dígitos
  sequentialNumber: number;      // número entero
  numericCode: number;           // libre elección del emisor (8 dígitos)
  emissionType: EmissionType | string;
}

@Injectable()
export class AccessKeyService {
  private readonly logger = new Logger(AccessKeyService.name);

  // Estructura oficial — Tabla 1 ficha técnica SRI v2.26:
  // ddmmaaaa(8) + codDoc(2) + ruc(13) + ambiente(1)
  // + estab(3) + ptoEmi(3) + secuencial(9) + codNumerico(8)
  // + tipoEmision(1) + verificador(1) = 49 dígitos
  generate(params: AccessKeyParams): string {
    const fecha      = this.formatDate(params.issueDate);
    const codDoc     = String(params.documentType).padStart(2, '0');
    const ruc        = params.ruc;
    const ambiente   = String(params.environment);
    const estab      = params.establishmentCode.padStart(3, '0');
    const ptoEmi     = params.emissionPoint.padStart(3, '0');
    const secuencial = String(params.sequentialNumber).padStart(9, '0');
    const codNum     = String(params.numericCode).padStart(8, '0').substring(0, 8);
    const tipoEm     = String(params.emissionType);

    const partial = fecha + codDoc + ruc + ambiente + estab + ptoEmi + secuencial + codNum + tipoEm;

    // Validación crítica — longitud exacta 48 dígitos antes del verificador
    if (partial.length !== 48) {
      this.logger.error(
        `Clave parcial con longitud incorrecta: ${partial.length} (esperado 48)`,
        { partial, params },
      );
      throw new Error(
        `Error generando clave de acceso: longitud ${partial.length} ≠ 48`,
      );
    }

    if (!/^\d{48}$/.test(partial)) {
      throw new Error('Clave de acceso contiene caracteres no numéricos');
    }

    const key = partial + this.mod11(partial);
    this.logger.debug(`Clave generada: ${key}`);
    return key;
  }

  validate(key: string): boolean {
    if (!key || key.length !== 49) return false;
    if (!/^\d{49}$/.test(key)) return false;
    return this.mod11(key.slice(0, 48)) === key.slice(48);
  }

  // Módulo 11 — ficha técnica SRI v2.26, sección 5.2
  // Pesos: 2,3,4,5,6,7 cíclicos de derecha a izquierda
  // Resultado=11 → dígito=0 | Resultado=10 → dígito=1
  private mod11(key48: string): string {
    const weights = [2, 3, 4, 5, 6, 7];
    let sum = 0;
    for (let i = key48.length - 1; i >= 0; i--) {
      sum += parseInt(key48[i], 10) * weights[(key48.length - 1 - i) % weights.length];
    }
    const d = 11 - (sum % 11);
    if (d === 11) return '0';
    if (d === 10) return '1';
    return String(d);
  }

  // Formato ddmmaaaa — confirmado Tabla 1 ficha técnica SRI
  private formatDate(date: Date): string {
    return (
      String(date.getDate()).padStart(2, '0') +
      String(date.getMonth() + 1).padStart(2, '0') +
      String(date.getFullYear())
    );
  }
}