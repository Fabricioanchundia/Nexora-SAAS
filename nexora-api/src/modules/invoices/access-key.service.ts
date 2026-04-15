import { Injectable, Logger } from '@nestjs/common';
import { EnvironmentType } from '../../common/enums/environment-type.enum';

export interface AccessKeyParams {
    issueDate: Date;
    documentType: string;      // '01' = factura (confirmado Tabla 3)
    ruc: string;               // 13 dígitos
    environment: EnvironmentType; // '1' pruebas / '2' producción (Tabla 4)
    establishmentCode: string; // 3 dígitos ej: '001'
    emissionPoint: string;     // 3 dígitos ej: '001'
    sequentialNumber: number;  // número entero del secuencial
    numericCode: number;       // libre elección del emisor (8 dígitos)
    emissionType: string;      // '1' = normal (Tabla 2)
}

@Injectable()
export class AccessKeyService {
    private readonly logger = new Logger(AccessKeyService.name);

  // Estructura oficial — Tabla 1 de la ficha técnica SRI v2.26:
  // ddmmaaaa(8) + codDoc(2) + ruc(13) + ambiente(1)
  // + estab(3) + ptoEmi(3) + secuencial(9) + codNumerico(8)
  // + tipoEmision(1) + verificador(1) = 49 dígitos totales
    generate(params: AccessKeyParams): string {
        const fecha = this.formatDate(params.issueDate);               // 8 dígitos
        const codDoc = params.documentType.padStart(2, '0');           // 2 dígitos
        const ruc = params.ruc;                                        // 13 dígitos
        const ambiente = String(params.environment);                   // 1 dígito
        const estab = params.establishmentCode.padStart(3, '0');      // 3 dígitos
        const ptoEmi = params.emissionPoint.padStart(3, '0');         // 3 dígitos
        const secuencial = String(params.sequentialNumber).padStart(9, '0'); // 9 dígitos
        const codNumerico = String(params.numericCode).padStart(8, '0').substring(0, 8); // 8 dígitos
        const tipoEmision = String(params.emissionType);              // 1 dígito

    const partial =
      fecha +       // 8  → total: 8
      codDoc +      // 2  → total: 10
      ruc +         // 13 → total: 23
      ambiente +    // 1  → total: 24
      estab +       // 3  → total: 27
      ptoEmi +      // 3  → total: 30
      secuencial +  // 9  → total: 39
      codNumerico + // 8  → total: 47
      tipoEmision;  // 1  → total: 48

    // Validación crítica — el SRI rechaza si la longitud no es exactamente 48
    if (partial.length !== 48) {
        this.logger.error(
            `Clave parcial con longitud incorrecta: ${partial.length} (esperado 48)`,
            { partial, params },
        );
        throw new Error(
        `Error generando clave de acceso: longitud ${partial.length} incorrecta (esperado 48)`,
        );
    }

    if (!/^\d{48}$/.test(partial)) {
        this.logger.error('Clave parcial contiene caracteres no numéricos', { partial });
        throw new Error('Error generando clave de acceso: caracteres no numéricos detectados');
    }

    const verificador = this.mod11(partial);
    const accessKey = partial + verificador;

    this.logger.debug(`Clave de acceso generada: ${accessKey}`);
    return accessKey;
    }

    validate(key: string): boolean {
        if (key?.length !== 49) return false;
        if (!/^\d{49}$/.test(key)) return false;
        const body = key.slice(0, 48);
        const provided = key.slice(48);
        return this.mod11(body) === provided;
    }

  // Módulo 11 — Ficha Técnica SRI Ecuador, sección 5.2
  // Pesos 2,3,4,5,6,7 cíclicos de derecha a izquierda
  // Resultado=11 → dígito=0 | Resultado=10 → dígito=1
    private mod11(key48: string): string {
        const weights = [2, 3, 4, 5, 6, 7];
        let sum = 0;
        let weightIndex = 0;

    for (let i = key48.length - 1; i >= 0; i--) {
        sum += Number.parseInt(key48[i], 10) * weights[weightIndex % weights.length];
        weightIndex++;
    }

    const remainder = sum % 11;
    const digit = 11 - remainder;

    if (digit === 11) return '0';
    if (digit === 10) return '1';
    return String(digit);
    }

  // Formato ddmmaaaa — confirmado Tabla 1 ficha técnica SRI
    private formatDate(date: Date): string {
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = String(date.getFullYear());
        return `${d}${m}${y}`;
    }
}