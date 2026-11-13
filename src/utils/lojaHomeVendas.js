// Regras do bloco "Presentes e últimas unidades" (sem React). O backend valida de novo; aqui só se avisa antes de enviar.
import { CAMPOS_HOME_VENDAS } from '../services/lojaHomeVendas';

export const LIMITES_HOME = {
  home_presentes_titulo: 80, home_presentes_texto: 200,
  home_ultimas_titulo: 80, home_ultimas_texto: 200,
  home_ajuda_titulo: 80, home_ajuda_texto: 200,
};

// Textos que a loja usa quando o campo fica em branco (iguais aos padrões da vitrine). Só para mostrar de exemplo no campo.
export const PADROES_HOME = {
  home_presentes_titulo: 'Escolha pelo quanto quer gastar',
  home_presentes_texto: 'Toque numa faixa de preço e veja as peças disponíveis.',
  home_ultimas_titulo: 'Últimas unidades',
  home_ultimas_texto: 'Peças que restam em pouca quantidade.',
  home_ajuda_titulo: 'Em dúvida sobre o que escolher?',
  home_ajuda_texto: 'Conte para quem é e quanto quer gastar, e a gente ajuda você a escolher.',
};

/** Formulário a partir do que o backend devolveu: texto onde há texto, vazio onde não há; a chave liga/desliga é booleana. */
export function formDoHomeVendas(dados) {
  return Object.fromEntries(CAMPOS_HOME_VENDAS.map((c) => [c, c === 'home_vendas_ativo' ? dados?.[c] === true : (dados?.[c] ?? '')]));
}

/** Corpo do PUT: textos aparados (vazio vira null: a loja volta ao texto padrão); a chave sai como booleano. */
export function montarCorpoHomeVendas(form) {
  return Object.fromEntries(CAMPOS_HOME_VENDAS.map((c) => [c, c === 'home_vendas_ativo' ? form[c] === true : (String(form[c] ?? '').trim() || null)]));
}

/** Primeiro problema encontrado (texto longo demais), ou null. */
export function validarHomeVendas(form) {
  for (const [campo, limite] of Object.entries(LIMITES_HOME)) {
    if (String(form[campo] ?? '').trim().length > limite) return `Este texto deve ter no máximo ${limite} caracteres.`;
  }

  return null;
}
