import { IsEnum, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IvaRate, TaxCode } from '../../../common/enums/tax-code.enum';

export class UpdateProductDto {
    @IsString() @IsOptional() @Length(1, 100) code?: string;
    @IsString() @IsOptional() @Length(1, 300) name?: string;
    @IsString() @IsOptional() description?: string;
    @Type(() => Number) @IsNumber({ maxDecimalPlaces: 4 }) @Min(0) @IsOptional() unitPrice?: number;
    @IsEnum(IvaRate) @IsOptional() ivaRate?: IvaRate;
    @IsEnum(TaxCode) @IsOptional() taxCode?: TaxCode;
}
