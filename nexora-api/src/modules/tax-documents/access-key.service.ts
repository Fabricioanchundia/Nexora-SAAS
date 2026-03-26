import { Injectable } from '@nestjs/common';
import { EnvironmentType } from '../../common/enums/environment-type.enum';

// ⚠️ PENDIENTE DE PARAMETRIZACIÓN CRÍTICA
// La clave de acceso de 49 dígitos se genera según algoritmo definido
// en la ficha técnica de comprobantes electrónicos del SRI Ecuador.
// VERIFICAR el algoritmo exacto (dígito verificador módulo 11) con la
// ficha técnica vigente ANTES de usar en producción.
//
// Estructura de la clave (49 dígitos):
// [fechaEmision:8][tipoComprobante:2][ruc:13][ambiente:1]
// [serie:6][numeroComprobante:9][codigoNumerico:8][tipoEmision:1]
// [digitoVerificador:1]

export interface AccessKeyParams {
  issueDate: Date;
  documentType: string;  // código del tipo — verificar ficha técnica
  ruc: string;
  environment: EnvironmentType;
  sequential: string;    // formato: 001-001-000000001
  emissionType: string;
}

@Injectable()
export class AccessKeyService {
  generate(params: AccessKeyParams): string {
    const fecha = this.formatDate(params.issueDate);
    const ambiente = params.environment; // '1' pruebas, '2' producción
    const serie = params.sequential.replace(/-/g, '').substring(0, 6); // 001001
    const numero = params.sequential.replace(/-/g, '').substring(6);   // 000000001
    const codigoNumerico = this.generateNumericCode();
    const tipoEmision = params.emissionType;

    const partial =
      fecha +
      params.documentType +
      params.ruc +
      ambiente +
      serie +
      numero +
      codigoNumerico +
      tipoEmision;

    // 48 dígitos + 1 dígito verificador = 49
    const verificador = this.calculateVerificationDigit(partial);
    return partial + verificador;
  }

  // ⚠️ PENDIENTE DE PARAMETRIZACIÓN
  // Algoritmo módulo 11 con pesos según ficha técnica SRI
  // Verificar con ficha técnica vigente: el orden y los pesos pueden cambiar
  private calculateVerificationDigit(key48: string): string {
    const weights = [2, 3, 4, 5, 6, 7]; // pesos del módulo 11 — VERIFICAR
    let sum = 0;
    let weightIndex = 0;

    for (let i = key48.length - 1; i >= 0; i--) {
      sum += parseInt(key48[i], 10) * weights[weightIndex % weights.length];
      weightIndex++;
    }

    const remainder = sum % 11;
    const digit = 11 - remainder;

    if (digit === 11) return '0';
    if (digit === 10) return '1';
    return String(digit);
  }

  private formatDate(date: Date): string {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear());
    return `${d}${m}${y}`; // ddmmyyyy — verificar orden con ficha técnica
  }

  private generateNumericCode(): string {
    // Código numérico de 8 dígitos (puede ser aleatorio o secuencial)
    // ⚠️ Verificar si el SRI tiene restricciones sobre la generación
    return String(Math.floor(Math.random() * 99999999)).padStart(8, '0');
  }

  validate(key: string): boolean {
    if (!key || key.length !== 49) return false;
    const body = key.slice(0, 48);
    const provided = key.slice(48);
    return this.calculateVerificationDigit(body) === provided;
  }
}