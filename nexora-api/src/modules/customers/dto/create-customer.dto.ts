import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  Length,
  MaxLength,
} from 'class-validator';
import { IdentificationType } from '../../../common/enums/identification-type.enum';

export class CreateCustomerDto {
  @IsEnum(IdentificationType)
  identificationType: IdentificationType;

  @IsString()
  @Length(1, 20)
  identification: string;

  @IsString()
  @Length(1, 300)
  fullName: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;
}