import {
    IsEmail, IsEnum, IsOptional, IsString, Length, MaxLength,
} from 'class-validator';
import { IdentificationType } from '../../../common/enums/identification-type.enum';

export class UpdateCustomerDto {
    @IsEnum(IdentificationType) @IsOptional() identificationType?: IdentificationType;
    @IsString() @IsOptional() @Length(1, 20) identification?: string;
    @IsString() @IsOptional() @Length(1, 300) fullName?: string;
    @IsEmail() @IsOptional() email?: string;
    @IsString() @IsOptional() @MaxLength(20) phone?: string;
    @IsString() @IsOptional() @MaxLength(500) address?: string;
}
