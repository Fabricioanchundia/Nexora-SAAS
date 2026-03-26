import {
  ArrayMinSize, IsArray, IsBoolean, IsDateString,
  IsIn, IsNumber, IsOptional, IsString,
  IsUUID, Length, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

// Formas de pago válidas — Tabla 24 ficha técnica SRI v2.26
// Las más comunes para el MVP
const FORMAS_PAGO_VALIDAS = [
  '01', // Sin utilización del sistema financiero
  '15', // Compensación de deudas
  '16', // Tarjeta de débito
  '17', // Dinero electrónico
  '18', // Tarjeta prepago
  '19', // Tarjeta de crédito
  '20', // Otros con utilización del sistema financiero
  '21', // Endoso de títulos
];

export class PaymentMethodDto {
  @IsString()
  @IsIn(FORMAS_PAGO_VALIDAS, {
    message: `formaPago debe ser uno de: ${FORMAS_PAGO_VALIDAS.join(', ')}`,
  })
  code: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  total: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  term?: number;

  @IsString()
  @IsIn(['dias', 'meses', 'anios'])
  @IsOptional()
  timeUnit?: string;
}

export class CreateInvoiceDto {
  @IsUUID()
  customerId: string;

  @IsDateString()
  issueDate: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  // Si no se especifica, el XML usará '01' (sin sistema financiero) por defecto
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods?: PaymentMethodDto[];

  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;

  // Número de guía de remisión (opcional)
  @IsString()
  @IsOptional()
  @Length(17, 17, { message: 'La guía de remisión debe tener formato 000-000-000000000' })
  guiaRemision?: string;

  // Clave de idempotencia — el cliente la genera (UUID v4)
  @IsString()
  @IsOptional()
  @MaxLength(100)
  idempotencyKey?: string;
}