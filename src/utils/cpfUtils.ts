/**
 * Utilitários para validação e formatação de CPF
 */

/**
 * Valida se um CPF é válido usando o algoritmo oficial
 * @param cpf CPF a ser validado (pode conter pontuação)
 * @returns true se o CPF for válido, false caso contrário
 */
export function validateCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cpfClean = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpfClean.length !== 11) {
    return false;
  }
  
  // Verifica se todos os dígitos são iguais (CPF inválido, mas passa na validação)
  if (/^(\d)\1{10}$/.test(cpfClean)) {
    return false;
  }
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cpfClean.charAt(i)) * (10 - i);
  }
  
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(cpfClean.charAt(9)) !== digit1) {
    return false;
  }
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cpfClean.charAt(i)) * (11 - i);
  }
  
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(cpfClean.charAt(10)) === digit2;
}

/**
 * Formata um CPF adicionando pontuação (ex: 123.456.789-00)
 * @param cpf CPF a ser formatado (apenas números)
 * @returns CPF formatado
 */
export function formatCPF(cpf: string): string {
  const cpfClean = cpf.replace(/[^\d]/g, '');
  
  if (cpfClean.length !== 11) {
    return cpfClean;
  }
  
  return cpfClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Aplica máscara ao CPF enquanto o usuário digita
 * @param value Valor atual do input
 * @returns CPF com máscara aplicada
 */
export function maskCPF(value: string): string {
  const cpfClean = value.replace(/[^\d]/g, '');
  
  if (cpfClean.length <= 3) {
    return cpfClean;
  }
  
  if (cpfClean.length <= 6) {
    return `${cpfClean.slice(0, 3)}.${cpfClean.slice(3)}`;
  }
  
  if (cpfClean.length <= 9) {
    return `${cpfClean.slice(0, 3)}.${cpfClean.slice(3, 6)}.${cpfClean.slice(6)}`;
  }
  
  return `${cpfClean.slice(0, 3)}.${cpfClean.slice(3, 6)}.${cpfClean.slice(6, 9)}-${cpfClean.slice(9, 11)}`;
}
