import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { EnvironmentType } from '../../../common/enums/environment-type.enum';

export class UpdateCompanyDto {
  @IsString() @IsOptional() @Length(1, 300) businessName?: string;
  @IsString() @IsOptional() @Length(1, 300) tradeName?: string;
  @IsString() @IsOptional() @Length(1, 500) address?: string;
  @IsString() @IsOptional() phone?: string;
  @IsEmail() @IsOptional() email?: string;
  @IsEnum(EnvironmentType) @IsOptional() sriEnvironment?: EnvironmentType;
}
