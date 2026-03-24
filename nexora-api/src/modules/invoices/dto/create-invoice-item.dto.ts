import {
    IsEnum, IsNumber, IsOptional, IsString,
    IsUUID, Length, Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IvaRate, TaxCode } from '../../../common/enums/tax-code.enum';

export class CreateInvoiceItemDto {
    @IsUUID() @IsOptional() productId?: string;
    @IsString() @Length(1, 100) productCode: string;
    @IsString() @Length(1, 300) description: string;
    @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0.0001) quantity: number;
    @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) unitPrice: number;
    @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @IsOptional() discount?: number;
    @IsEnum(IvaRate) ivaRate: IvaRate;
    @IsEnum(TaxCode) @IsOptional() taxCode?: TaxCode;
}