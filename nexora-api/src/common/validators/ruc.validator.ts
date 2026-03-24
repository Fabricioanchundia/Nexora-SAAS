import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isValidRuc } from '../utils/ruc.util';

@ValidatorConstraint({ name: 'isRucEcuatoriano', async: false })
export class IsRucEcuatorianoConstraint implements ValidatorConstraintInterface {
    validate(ruc: string): boolean {
    return isValidRuc(ruc);
    }
    defaultMessage(): string {
    return 'El RUC ecuatoriano no es válido';
    }
}