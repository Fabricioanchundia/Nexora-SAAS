import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IvaRate, TaxCode } from '../../../common/enums/tax-code.enum';

export class CreateProductDto {
  @IsString() @Length(1, 100) code: string;
  @IsString() @Length(1, 300) name: string;
  @IsString() @IsOptional() description?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) unitPrice: number;
  @IsEnum(IvaRate) ivaRate: IvaRate;
  @IsEnum(TaxCode) @IsOptional() taxCode?: TaxCode;
}