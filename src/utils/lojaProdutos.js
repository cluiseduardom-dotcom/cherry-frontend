// Regras de apresentação da tela "Loja online" (sem React): o que dizer sobre cada peça.
// A decisão de verdade é do backend: a loja só mostra a peça marcada que tem preço no canal online
// (`aparece_na_loja`). Aqui só se traduz isso em linguagem de operação.

export const LIMITES = { titulo: 160, descricao: 4000, materiais: 2000, cuidados: 2000, ordem: 100000 };

/** Situação da peça na loja, em uma frase e um tom (para cor/ícone). */
export function situacaoDaPeca(item) {
  if (item.aparece_na_loja) return { rotulo: 'Na loja', tom: 'ok' };
  if (item.visivel) return { rotulo: 'Marcada, mas não aparece', tom: 'aviso' };
  return { rotulo: 'Fora da loja', tom: 'neutro' };
}

/** Avisos que ajudam a equipe a deixar a peça pronta. Só frases; não bloqueiam nada. */
export function avisosDaPeca(item) {
  const avisos = [];

  if (item.visivel && item.preco_online === null) {
    avisos.push('Sem preço no canal "online": a loja não mostra esta peça. Cadastre o preço do canal online.');
  } else if (!item.visivel && item.preco_online === null) {
    avisos.push('Ainda sem preço no canal "online": cadastre antes de mostrar na loja.');
  }
  if (item.saldo_central <= 0) avisos.push('Sem estoque no Central: a peça aparece como indisponível.');
  if (item.fotos === 0) avisos.push('Sem foto: a loja mostra o símbolo da marca no lugar.');

  return avisos;
}

/** Converte o formulário em corpo do PUT: texto vazio vira null (o backend também faz isso) e ordem vira inteiro. */
export function montarCorpo(form) {
  const texto = (v) => (typeof v === 'string' ? v.trim() : '');
  const ordem = Number.parseInt(String(form.ordem ?? '').trim() || '0', 10);

  return {
    titulo: texto(form.titulo) || null,
    descricao: texto(form.descricao) || null,
    materiais: texto(form.materiais) || null,
    cuidados: texto(form.cuidados) || null,
    ordem: Number.isFinite(ordem) ? ordem : 0,
  };
}

/** Mensagem de erro do formulário, ou '' se estiver ok. */
export function validarForm(form) {
  const ordem = String(form.ordem ?? '').trim();
  if (ordem !== '' && !/^\d+$/.test(ordem)) return 'A ordem deve ser um número inteiro (0 ou mais).';
  if (ordem !== '' && Number(ordem) > LIMITES.ordem) return `A ordem deve ser no máximo ${LIMITES.ordem}.`;

  for (const [campo, rotulo] of [['titulo', 'O título'], ['descricao', 'A descrição'], ['materiais', 'Os materiais'], ['cuidados', 'Os cuidados']]) {
    const tamanho = String(form[campo] ?? '').trim().length;
    if (tamanho > LIMITES[campo]) return `${rotulo} deve ter no máximo ${LIMITES[campo]} caracteres.`;
  }

  return '';
}

/** Valores iniciais do formulário a partir da marcação devolvida pela API. */
export function formDaMarcacao(marcacao) {
  return {
    titulo: marcacao?.titulo ?? '',
    descricao: marcacao?.descricao ?? '',
    materiais: marcacao?.materiais ?? '',
    cuidados: marcacao?.cuidados ?? '',
    ordem: String(marcacao?.ordem ?? 0),
  };
}
