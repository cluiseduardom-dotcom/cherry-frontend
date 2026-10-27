import { cnpjValido, somenteDigitos } from './mascaras';
import { UFS } from './usuarios';

export const CAMPOS_EMPRESA = [
  'nome', 'razao_social', 'cnpj', 'telefone', 'email_contato',
  'cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf',
];

export const EMPRESA_VAZIA = Object.freeze(Object.fromEntries(CAMPOS_EMPRESA.map(c => [c, ''])));

export function dadosParaFormulario(dados) {
  return Object.fromEntries(CAMPOS_EMPRESA.map(c => [c, dados?.[c] ?? '']));
}

export function validarEmpresa(form) {
  const erros = {};
  if (!form.nome.trim()) erros.nome = 'Nome é obrigatório';
  if (form.cnpj && !cnpjValido(form.cnpj)) erros.cnpj = 'CNPJ inválido';
  const tel = somenteDigitos(form.telefone);
  if (tel && !/^\d{10,11}$/.test(tel)) erros.telefone = 'Telefone inválido (use DDD + número)';
  if (form.email_contato && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email_contato.trim())) erros.email_contato = 'E-mail inválido';
  if (form.cep && somenteDigitos(form.cep).length !== 8) erros.cep = 'CEP deve ter 8 dígitos';
  if (form.uf && !UFS.includes(form.uf)) erros.uf = 'UF inválida';
  return erros;
}

// Só o que mudou em relação ao carregado; documentos/telefone/CEP seguem como dígitos.
export function montarPayloadEmpresa(form, inicial) {
  const norm = (campo, valor) => {
    const v = String(valor ?? '').trim();
    return ['cnpj', 'telefone', 'cep'].includes(campo) ? somenteDigitos(v) : v;
  };
  const payload = {};
  for (const campo of CAMPOS_EMPRESA) {
    const novo = norm(campo, form[campo]);
    if (novo !== norm(campo, inicial?.[campo])) payload[campo] = novo;
  }
  return payload;
}
