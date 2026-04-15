import {
  ArrayMinSize, IsArray, IsDateString, IsIn, IsNumber,
  IsOptional, IsString, IsUUID, Length, MaxLength, Min, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

const FORMAS_PAGO_VALIDAS = ['01','15','16','17','18','19','20','21'];

export class PaymentMethodDto {
  @IsString()
  @IsIn(FORMAS_PAGO_VALIDAS, { message: `formaPago debe ser uno de: ${FORMAS_PAGO_VALIDAS.join(', ')}` })
  code!: string;

  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) total!: number;
  @IsNumber() @Min(0) @IsOptional() term?: number;
  @IsString() @IsIn(['dias', 'meses', 'anios']) @IsOptional() timeUnit?: string;
}

export class CreateInvoiceDto {
  @IsUUID() customerId!: string;
  @IsDateString() issueDate!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items!: CreateInvoiceItemDto[];

  @IsArray() @IsOptional() @ValidateNested({ each: true }) @Type(() => PaymentMethodDto)
  paymentMethods?: PaymentMethodDto[];

  @IsString() @IsOptional() @MaxLength(500) notes?: string;

  @IsString() @IsOptional()
  @Length(17, 17, { message: 'La guía de remisión debe tener formato 000-000-000000000' })
  guiaRemision?: string;

  @IsString() @IsOptional() @MaxLength(100) idempotencyKey?: string;
}
