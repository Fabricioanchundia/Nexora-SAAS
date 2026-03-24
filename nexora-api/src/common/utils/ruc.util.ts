export function isValidRuc(ruc: string): boolean {
    if (!ruc || ruc.length !== 13) return false;
    if (!/^\d{13}$/.test(ruc)) return false;
    const provincia = parseInt(ruc.substring(0, 2), 10);
    if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;
    const tercerDigito = parseInt(ruc[2], 10);
    const establecimiento = parseInt(ruc.substring(10, 13), 10);
    if (establecimiento < 1) return false;
    return tercerDigito < 6 || tercerDigito === 9 || tercerDigito === 6;
}

export function isValidCedula(cedula: string): boolean {
    if (!cedula || cedula.length !== 10) return false;
    if (!/^\d{10}$/.test(cedula)) return false;
    const provincia = parseInt(cedula.substring(0, 2), 10);
    if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;
    const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let suma = 0;
    for (let i = 0; i < 9; i++) {
    let valor = parseInt(cedula[i], 10) * coeficientes[i];
    if (valor >= 10) valor -= 9;
    suma += valor;
    }
    const digitoVerificador = parseInt(cedula[9], 10);
    const residuo = suma % 10;
    const resultado = residuo === 0 ? 0 : 10 - residuo;
    return resultado === digitoVerificador;
}