import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatus } from '../../../common/enums/invoice-status.enum';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class InvoiceFiltersDto extends PaginationDto {
    @IsEnum(InvoiceStatus) @IsOptional() status?: InvoiceStatus;
    @IsDateString() @IsOptional() dateFrom?: string;
    @IsDateString() @IsOptional() dateTo?: string;
}