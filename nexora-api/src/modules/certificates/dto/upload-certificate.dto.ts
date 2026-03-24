import { IsString, MinLength } from 'class-validator';

export class UploadCertificateDto {
    @IsString()
    @MinLength(1, { message: 'El passphrase no puede estar vacío' })
    passphrase: string;
}