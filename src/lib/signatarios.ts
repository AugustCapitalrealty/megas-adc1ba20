/**
 * Utilitários dos dados de assinatura (Webdox — antigo Projuris).
 * Representante legal e testemunha são exigidos quando o instrumento
 * jurídico não é OC (termo de contratação / contratos).
 */

export function maskCPF(value: string): string {
  const d = (value || '').replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
}

export function maskTelefone(value: string): string {
  const d = (value || '').replace(/\D/g, '').slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2');
  }
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2');
}

export function isValidCPF(value: string): boolean {
  const cpf = (value || '').replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cpf[i], 10) * (10 - i);
  let d1 = (sum * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(cpf[9], 10)) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cpf[i], 10) * (11 - i);
  let d2 = (sum * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(cpf[10], 10);
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((value || '').trim());
}

export function isValidTelefone(value: string): boolean {
  const d = (value || '').replace(/\D/g, '');
  return d.length === 10 || d.length === 11;
}

export interface SignatarioInput {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
}

/** Retorna mensagens de erro por campo (chaves prefixadas). */
export function validarSignatario(prefix: string, s: SignatarioInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!s.nome.trim() || s.nome.trim().length < 5) errors[`${prefix}Nome`] = 'Informe o nome completo.';
  if (!isValidCPF(s.cpf)) errors[`${prefix}Cpf`] = 'CPF inválido.';
  if (!isValidEmail(s.email)) errors[`${prefix}Email`] = 'E-mail inválido.';
  if (!isValidTelefone(s.telefone)) errors[`${prefix}Telefone`] = 'Telefone inválido (DDD + número).';
  return errors;
}