import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Validación básica de RUC ecuatoriano
// RUC puede ser: persona natural (cédula + 001), jurídica, o pública
// NOTA: Esta es una validación de formato. La validación definitiva es del SRI.
@ValidatorConstraint({ name: 'isRucEcuatoriano', async: false })
export class IsRucEcuatorianoConstraint
  implements ValidatorConstraintInterface
{
  validate(ruc: string): boolean {
    if (!ruc || ruc.length !== 13) return false;
    if (!/^\d{13}$/.test(ruc)) return false;

    const provincia = parseInt(ruc.substring(0, 2), 10);
    if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;

    const tercerDigito = parseInt(ruc[2], 10);

    // Los tres últimos dígitos (establecimiento) deben ser > 0
    const establecimiento = parseInt(ruc.substring(10, 13), 10);
    if (establecimiento < 1) return false;

    // Persona natural: tercer dígito < 6
    if (tercerDigito < 6) return true;

    // Persona jurídica privada: tercer dígito = 9
    if (tercerDigito === 9) return true;

    // Entidad pública: tercer dígito = 6
    if (tercerDigito === 6) return true;

    return false;
  }

  defaultMessage(): string {
    return 'El RUC ecuatoriano no es válido';
  }
}