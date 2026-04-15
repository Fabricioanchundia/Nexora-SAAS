export function isValidRuc(ruc: string): boolean {
  if (!ruc?.length || ruc.length !== 13) return false;
  if (!/^\d{13}$/.test(ruc)) return false;

  const provincia = Number.parseInt(ruc.substring(0, 2), 10);
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;

  const tercerDigito = Number.parseInt(ruc[2], 10);
  const establecimiento = Number.parseInt(ruc.substring(10, 13), 10);

  // El establecimiento debe ser >= 001
  if (establecimiento < 1) return false;

  // Persona natural: tercer dígito 0-5
  if (tercerDigito >= 0 && tercerDigito <= 5) {
    return isValidCedula(ruc.substring(0, 10));
  }

  // Sociedad privada / extranjera: tercer dígito = 9
  if (tercerDigito === 9) {
    return validarModulo11Ruc(ruc.substring(0, 10), [4, 3, 2, 7, 6, 5, 4, 3, 2]);
  }

  // Entidad pública: tercer dígito = 6
  if (tercerDigito === 6) {
    return validarModulo11Ruc(ruc.substring(0, 9), [3, 2, 7, 6, 5, 4, 3, 2]);
  }

  return false;
}

export function isValidCedula(cedula: string): boolean {
  if (!cedula?.length || cedula.length !== 10) return false;
  if (!/^\d{10}$/.test(cedula)) return false;

  const provincia = Number.parseInt(cedula.substring(0, 2), 10);
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;

  const tercerDigito = Number.parseInt(cedula[2], 10);
  if (tercerDigito > 5) return false;

  // Algoritmo módulo 10
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;

  for (let i = 0; i < 9; i++) {
    let valor = Number.parseInt(cedula[i], 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
  }

  const residuo = suma % 10;
  const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;

  return digitoVerificador === Number.parseInt(cedula[9], 10);
}

function validarModulo11Ruc(
  numeros: string,
  coeficientes: number[],
): boolean {
  let suma = 0;
  for (let i = 0; i < coeficientes.length; i++) {
    suma += Number.parseInt(numeros[i], 10) * coeficientes[i];
  }

  const residuo = suma % 11;
  let digitoVerificador: number;

  if (residuo === 0) {
    digitoVerificador = 0;
  } else if (residuo === 1) {
    return false; // No válido cuando residuo = 1 en módulo 11 para RUC
  } else {
    digitoVerificador = 11 - residuo;
  }

  return digitoVerificador === Number.parseInt(numeros[coeficientes.length], 10);
}