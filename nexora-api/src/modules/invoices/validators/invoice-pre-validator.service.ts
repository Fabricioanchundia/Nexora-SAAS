// PROPÓSITO: detectar errores ANTES de generar XML y transmitir al SRI.
// Previene el 80% de rechazos del SRI con mensajes claros en español.
//
// Por qué importa: cuando el SRI rechaza (DEVUELTA), el estado queda
// como REJECTED y no es reintentable automáticamente.
// Mejor detectarlo aquí y dar un mensaje útil al usuario.
import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { CreateInvoiceDto } from '../dto/create-invoice.dto';
import { Company } from '../../companies/entities/company.entity';
import { Customer } from '../../customers/entities/customer.entity';
import {
  MAX_DAYS_BEFORE_ISSUE,
  CONSUMIDOR_FINAL_LIMIT_USD,
} from '../../../config/sri-config';
import {
  isValidRuc,
  isValidCedula,
} from '../../../common/utils/ruc.util';
import { IdentificationType } from '../../../common/enums/identification-type.enum';

export interface ValidationError {
  field: string;
  // Mensaje en español para el usuario — no el error técnico del SRI
  message: string;
  // Si se puede corregir sin anular la factura
  fixable: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

@Injectable()
export class InvoicePreValidatorService {
  private readonly logger = new Logger(InvoicePreValidatorService.name);

  validate(
    dto: CreateInvoiceDto,
    company: Company,
    customer: Customer,
  ): ValidationResult {
    const errors: ValidationError[] = [];

    this.validateFechaEmision(dto, errors);
    this.validateCompany(company, errors);
    this.validateCustomer(customer, errors);
    this.validateItems(dto, errors);
    this.validateConsumidorFinal(dto, customer, errors);
    this.validateTotales(dto, errors);

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
    };

    if (!result.valid) {
      this.logger.warn(
        `Pre-validación falló: ${errors.map((e) => e.message).join(' | ')}`,
      );
    }

    return result;
  }

  // Lanza excepción si hay errores — para usar en el flujo principal
  validateOrThrow(
    dto: CreateInvoiceDto,
    company: Company,
    customer: Customer,
  ): void {
    const result = this.validate(dto, company, customer);
    if (!result.valid) {
      throw new BadRequestException({
        message: 'La factura tiene errores que el SRI rechazaría',
        errors: result.errors,
      });
    }
  }

  // ─── Validaciones individuales ────────────────────────────────────────────

  private validateFechaEmision(
    dto: CreateInvoiceDto,
    errors: ValidationError[],
  ): void {
    const issueDate = new Date(dto.issueDate);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (isNaN(issueDate.getTime())) {
      errors.push({
        field: 'issueDate',
        message: 'La fecha de emisión no es válida.',
        fixable: true,
      });
      return;
    }

    // ⚠️ PENDIENTE: verificar exactamente los días permitidos con ficha técnica SRI
    if (diffDays > MAX_DAYS_BEFORE_ISSUE) {
      errors.push({
        field: 'issueDate',
        message: `La fecha de emisión no puede ser anterior a ${MAX_DAYS_BEFORE_ISSUE} días. Hoy es ${now.toLocaleDateString('es-EC')}.`,
        fixable: true,
      });
    }

    if (issueDate > now) {
      errors.push({
        field: 'issueDate',
        message: 'La fecha de emisión no puede ser en el futuro.',
        fixable: true,
      });
    }
  }

  private validateCompany(
    company: Company,
    errors: ValidationError[],
  ): void {
    if (!company.ruc || !isValidRuc(company.ruc)) {
      errors.push({
        field: 'company.ruc',
        message: `El RUC de tu empresa (${company.ruc}) no es válido. Ve a Configuración y corrígelo.`,
        fixable: false,
      });
    }

    if (!company.establishmentCode?.match(/^\d{3}$/)) {
      errors.push({
        field: 'company.establishmentCode',
        message: 'El código de establecimiento debe tener exactamente 3 dígitos.',
        fixable: false,
      });
    }

    if (!company.emissionPoint?.match(/^\d{3}$/)) {
      errors.push({
        field: 'company.emissionPoint',
        message: 'El punto de emisión debe tener exactamente 3 dígitos.',
        fixable: false,
      });
    }
  }

  private validateCustomer(
    customer: Customer,
    errors: ValidationError[],
  ): void {
    if (!customer.identificationType) {
      errors.push({
        field: 'customer.identificationType',
        message: 'El cliente no tiene tipo de identificación configurado.',
        fixable: true,
      });
      return;
    }

    const id = customer.identification?.trim() ?? '';

    switch (customer.identificationType) {
      case IdentificationType.RUC:
        if (!isValidRuc(id)) {
          errors.push({
            field: 'customer.identification',
            message: `El RUC del cliente "${id}" no es válido. Verifícalo antes de emitir.`,
            fixable: true,
          });
        }
        break;

      case IdentificationType.CEDULA:
        if (!isValidCedula(id)) {
          errors.push({
            field: 'customer.identification',
            message: `La cédula del cliente "${id}" no es válida. Verifícala antes de emitir.`,
            fixable: true,
          });
        }
        break;

      case IdentificationType.CONSUMIDOR_FINAL:
        if (id !== '9999999999999') {
          errors.push({
            field: 'customer.identification',
            message: 'La identificación del consumidor final debe ser 9999999999999.',
            fixable: true,
          });
        }
        break;

      // PASAPORTE y EXTERIOR se aceptan sin validación de formato
    }
  }

  private validateItems(
    dto: CreateInvoiceDto,
    errors: ValidationError[],
  ): void {
    if (!dto.items?.length) {
      errors.push({
        field: 'items',
        message: 'La factura debe tener al menos un producto o servicio.',
        fixable: true,
      });
      return;
    }

    for (let i = 0; i < dto.items.length; i++) {
      const item = dto.items[i];

      if (!item.productCode?.trim()) {
        errors.push({
          field: `items[${i}].productCode`,
          message: `El ítem ${i + 1} no tiene código de producto.`,
          fixable: true,
        });
      }

      if (!item.description?.trim()) {
        errors.push({
          field: `items[${i}].description`,
          message: `El ítem ${i + 1} no tiene descripción.`,
          fixable: true,
        });
      }

      if (Number(item.quantity) <= 0) {
        errors.push({
          field: `items[${i}].quantity`,
          message: `La cantidad del ítem "${item.description || i + 1}" debe ser mayor a cero.`,
          fixable: true,
        });
      }

      if (Number(item.unitPrice) < 0) {
        errors.push({
          field: `items[${i}].unitPrice`,
          message: `El precio del ítem "${item.description || i + 1}" no puede ser negativo.`,
          fixable: true,
        });
      }

      const disc = Number(item.discount ?? 0);
      const subtotal = Number(item.quantity) * Number(item.unitPrice);
      if (disc > subtotal) {
        errors.push({
          field: `items[${i}].discount`,
          message: `El descuento del ítem "${item.description || i + 1}" no puede ser mayor al valor total del ítem.`,
          fixable: true,
        });
      }
    }
  }

  private validateConsumidorFinal(
    dto: CreateInvoiceDto,
    customer: Customer,
    errors: ValidationError[],
  ): void {
    if (customer.identificationType !== IdentificationType.CONSUMIDOR_FINAL) {
      return;
    }

    // Calcular total del DTO
    const total = dto.items.reduce((acc, item) => {
      const subtotal = new Decimal(item.quantity)
        .mul(item.unitPrice)
        .minus(item.discount ?? 0);
      const tax = subtotal.mul(0.15); // usar tarifa máxima para la validación
      return acc.plus(subtotal).plus(tax);
    }, new Decimal(0));

    // ⚠️ PENDIENTE: verificar límite vigente con ficha técnica SRI
    if (total.greaterThan(CONSUMIDOR_FINAL_LIMIT_USD)) {
      errors.push({
        field: 'customer',
        message: `Las facturas a Consumidor Final no pueden superar $${CONSUMIDOR_FINAL_LIMIT_USD}. El total es $${total.toFixed(2)}. Debes ingresar los datos del comprador.`,
        fixable: true,
      });
    }
  }

  private validateTotales(
    dto: CreateInvoiceDto,
    errors: ValidationError[],
  ): void {
    const total = dto.items.reduce((acc, item) => {
      return acc.plus(
        new Decimal(item.quantity)
          .mul(item.unitPrice)
          .minus(item.discount ?? 0),
      );
    }, new Decimal(0));

    if (total.lessThanOrEqualTo(0)) {
      errors.push({
        field: 'total',
        message: 'El total de la factura debe ser mayor a cero.',
        fixable: true,
      });
    }
  }
}