import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isValidCedula } from '../utils/ruc.util';

@ValidatorConstraint({ name: 'isCedulaEcuatoriana', async: false })
export class IsCedulaEcuatorianaConstraint implements ValidatorConstraintInterface {
    validate(cedula: string): boolean {
    return isValidCedula(cedula);
    }
    defaultMessage(): string {
    return 'La cédula ecuatoriana no es válida';
    }
}
