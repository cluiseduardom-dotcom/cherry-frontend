// Regras de apresentação dos retratos da Home (sem React). A decisão de verdade é do backend:
// só vai ao ar o retrato ATIVO e com a autorização de uso de imagem confirmada.

export const LIMITES_RETRATO = { alt: 300, nome: 120 };
// O backend aceita até 2 MB por foto; a tela reduz a foto antes de enviar.
export const MAX_BYTES_RETRATO = 2 * 1024 * 1024;
export const ALTURA_MAXIMA = 1920;

export function situacaoDoRetrato(r) {
  if (r.ativo && r.autorizacao_assinada) return { rotulo: 'Aparece na Home', tom: 'ok' };
  if (r.autorizacao_assinada) return { rotulo: 'Autorizada, mas desligada', tom: 'neutro' };
  return { rotulo: 'Aguardando autorização', tom: 'aviso' };
}

/** O que falta para o retrato poder ser mostrado na Home (frases para a equipe). */
export function pendenciasDoRetrato(r, { alt = r.alt, autorizada = r.autorizacao_assinada } = {}) {
  const itens = [];
  if (!autorizada) itens.push('Confirme a autorização de uso de imagem (termo assinado).');
  if (!(alt && alt.trim())) itens.push('Descreva a foto (texto para quem usa leitor de tela).');
  return itens;
}

export function validarTextos({ alt = '', nome = '', ordem = '0' }) {
  if (String(alt).trim().length > LIMITES_RETRATO.alt) return `A descrição deve ter no máximo ${LIMITES_RETRATO.alt} caracteres.`;
  if (String(nome).trim().length > LIMITES_RETRATO.nome) return `O nome deve ter no máximo ${LIMITES_RETRATO.nome} caracteres.`;
  const o = String(ordem ?? '').trim();
  if (o !== '' && !/^\d+$/.test(o)) return 'A ordem deve ser um número inteiro (0 ou mais).';
  return '';
}

/** Tamanho final da foto: nunca maior que a altura máxima, mantendo a proporção (e nunca aumenta). */
export function tamanhoReduzido(largura, altura, alturaMaxima = ALTURA_MAXIMA) {
  if (!(largura > 0) || !(altura > 0)) return { largura: 0, altura: 0 };
  const fator = Math.min(1, alturaMaxima / altura);
  return { largura: Math.max(1, Math.round(largura * fator)), altura: Math.max(1, Math.round(altura * fator)) };
}

/** Aviso (não bloqueia) quando a foto não é vertical como a Home pede. */
export function avisoDeProporcao(largura, altura) {
  if (!(largura > 0) || !(altura > 0)) return '';
  if (altura / largura < 1.3) return 'Esta foto não é bem vertical: na Home ela é cortada. O ideal é vertical, 9:16 (ex.: 1080×1920).';
  return '';
}

export function dataBr(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR');
}
