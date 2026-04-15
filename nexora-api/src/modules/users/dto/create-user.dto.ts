import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Email inválido' }) email!: string;
  @IsString() @MinLength(8) @MaxLength(100) password!: string;
  @IsString() @MinLength(2) @MaxLength(200) fullName!: string;
}
