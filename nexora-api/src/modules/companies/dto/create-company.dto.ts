import { IsEmail, IsEnum, IsOptional, IsString, Length, Matches } from 'class-validator';
import { EnvironmentType } from '../../../common/enums/environment-type.enum';

export class CreateCompanyDto {
  @IsString()
  @Length(13, 13, { message: 'El RUC debe tener exactamente 13 dígitos' })
  @Matches(/^\d{13}$/, { message: 'El RUC debe contener solo dígitos' })
  ruc!: string;

  @IsString() @Length(1, 300) businessName!: string;
  @IsString() @IsOptional() @Length(1, 300) tradeName?: string;
  @IsString() @Length(1, 500) address!: string;
  @IsString() @IsOptional() phone?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsEnum(EnvironmentType) sriEnvironment!: EnvironmentType;

  @IsString()
  @Length(3, 3, { message: 'El código de establecimiento debe tener 3 dígitos' })
  @Matches(/^\d{3}$/)
  establishmentCode!: string;

  @IsString()
  @Length(3, 3, { message: 'El punto de emisión debe tener 3 dígitos' })
  @Matches(/^\d{3}$/)
  emissionPoint!: string;
}
