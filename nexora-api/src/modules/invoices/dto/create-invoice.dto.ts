import {
  ArrayMinSize, IsArray, IsDateString,
  IsOptional, IsString, IsUUID, ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInvoiceItemDto } from './create-invoice-item.dto';

export class CreateInvoiceDto {
  @IsUUID() customerId: string;
  @IsDateString() issueDate: string;
  @IsArray()
  @ArrayMinSize(1, { message: 'La factura debe tener al menos un ítem' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];
  @IsString() @IsOptional() notes?: string;
}