export function isValidRuc(ruc: string): boolean {
  if (!ruc || ruc.length !== 13 || !/^\d{13}$/.test(ruc)) return false;

  const provincia      = parseInt(ruc.substring(0, 2), 10);
  const tercerDigito   = parseInt(ruc[2], 10);
  const establecimiento = parseInt(ruc.substring(10, 13), 10);

  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;
  if (establecimiento < 1) return false;

  if (tercerDigito <= 5) return isValidCedula(ruc.substring(0, 10));
  if (tercerDigito === 9) return validarModulo11Ruc(ruc.substring(0, 10), [4, 3, 2, 7, 6, 5, 4, 3, 2]);
  if (tercerDigito === 6) return validarModulo11Ruc(ruc.substring(0, 9), [3, 2, 7, 6, 5, 4, 3, 2]);

  return false;
}

export function isValidCedula(cedula: string): boolean {
  if (!cedula || cedula.length !== 10 || !/^\d{10}$/.test(cedula)) return false;

  const provincia    = parseInt(cedula.substring(0, 2), 10);
  const tercerDigito = parseInt(cedula[2], 10);

  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;
  if (tercerDigito > 5) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const suma = coeficientes.reduce((acc, coef, i) => {
    const val = parseInt(cedula[i], 10) * coef;
    return acc + (val >= 10 ? val - 9 : val);
  }, 0);

  const residuo = suma % 10;
  const digitoVerificador = residuo === 0 ? 0 : 10 - residuo;
  return digitoVerificador === parseInt(cedula[9], 10);
}

function validarModulo11Ruc(numeros: string, coeficientes: number[]): boolean {
  const suma = coeficientes.reduce((acc, coef, i) => acc + parseInt(numeros[i], 10) * coef, 0);
  const residuo = suma % 11;
  if (residuo === 1) return false;
  const digitoVerificador = residuo === 0 ? 0 : 11 - residuo;
  return digitoVerificador === parseInt(numeros[coeficientes.length], 10);
}
