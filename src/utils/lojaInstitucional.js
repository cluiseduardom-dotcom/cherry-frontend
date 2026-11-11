// Regras do formulário "Institucional da loja" (sem React). O backend valida de novo; aqui só se avisa antes de enviar.
import { CAMPOS_INSTITUCIONAL } from '../services/lojaInstitucional';

export const LIMITES_INST = {
  historia: 6000, fundadora_nome: 120, servicos: 1500, atendimento: 1000, horario_atendimento: 200,
  email_contato: 160, razao_social: 160, endereco: 300,
};

const REDES = {
  instagram_url: { rotulo: 'Instagram', dominios: ['instagram.com'] },
  facebook_url: { rotulo: 'Facebook', dominios: ['facebook.com', 'fb.com'] },
  tiktok_url: { rotulo: 'TikTok', dominios: ['tiktok.com'] },
};

/** Formulário a partir do que o backend devolveu: tudo texto, vazio onde não há nada. */
export function formDoInstitucional(dados) {
  return Object.fromEntries(CAMPOS_INSTITUCIONAL.map((c) => [c, dados?.[c] ?? '']));
}

/** Corpo do PUT: texto aparado; vazio vira null (limpa o campo no backend). */
export function montarCorpoInstitucional(form) {
  return Object.fromEntries(CAMPOS_INSTITUCIONAL.map((c) => [c, String(form[c] ?? '').trim() || null]));
}

export function linkDaRedeValido(campo, valor) {
  const v = String(valor ?? '').trim();
  if (!v) return true;

  try {
    const u = new URL(v);
    const host = u.hostname.toLowerCase();
    return u.protocol === 'https:' && !u.username && !u.password && REDES[campo].dominios.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function cnpjValido(texto) {
  const d = String(texto ?? '').replace(/\D/g, '');
  if (!/^\d{14}$/.test(d) || /^(\d)\1+$/.test(d)) return false;

  const dv = (base) => {
    let soma = 0;
    let peso = base.length - 7;
    for (const n of base) { soma += Number(n) * peso; peso = peso === 2 ? 9 : peso - 1; }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };

  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}

/** Mensagem do primeiro problema do formulário, ou '' se estiver ok. */
export function validarInstitucional(form) {
  for (const [campo, limite] of Object.entries(LIMITES_INST)) {
    if (String(form[campo] ?? '').trim().length > limite) return `Um dos textos passou de ${limite} caracteres (${campo.replace(/_/g, ' ')}).`;
  }

  for (const [campo, { rotulo, dominios }] of Object.entries(REDES)) {
    if (!linkDaRedeValido(campo, form[campo])) return `O link do ${rotulo} precisa ser o endereço completo do perfil, de ${dominios[0]}, começando com https://`;
  }

  const email = String(form.email_contato ?? '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return 'E-mail inválido.';

  const zap = String(form.whatsapp ?? '').replace(/\D/g, '');
  if (zap && !/^(\d{10,11}|55\d{10,11})$/.test(zap)) return 'WhatsApp inválido: informe o DDD e o número (ex.: 11 99999-9999).';

  if (String(form.cnpj ?? '').trim() && !cnpjValido(form.cnpj)) return 'CNPJ inválido.';

  return '';
}

/** Formata os dígitos do CNPJ como 00.000.000/0000-00 (se não tiver 14 dígitos, devolve como veio). */
export function formatarCnpj(valor) {
  const d = String(valor ?? '').replace(/\D/g, '');
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : String(valor ?? '');
}
