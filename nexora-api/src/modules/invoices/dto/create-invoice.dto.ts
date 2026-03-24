import {
  IsUUID,
  IsDateString,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsEnum,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TaxCode, IvaRate } from '../../../common/enums/tax-code.enum';

export class CreateInvoiceItemDto {
  @IsUUID()
  @IsOptional()
  productId?: string; // opcional — puede ser un ítem libre

  @IsString()
  @Length(1, 100)
  productCode: string; // obligatorio incluso para ítems libres

  @IsString()
  @Length(1, 300)
  description: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  quantity: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  unitPrice: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsEnum(IvaRate)
  ivaRate: IvaRate;

  @IsEnum(TaxCode)
  @IsOptional()
  taxCode?: TaxCode;
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

  @IsString()
  @IsOptional()
  notes?: string;
}