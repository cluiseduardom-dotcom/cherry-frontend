// Regras do formulário "Faixas da Home" (sem React). O backend valida de novo; aqui só se avisa antes de enviar.

export const MAX_BANNERS = 6;
export const LIMITES_BANNER = { rotulo: 40, titulo: 100, destaque: 40, subtitulo: 120, botao_texto: 30, link: 300, rodape_texto: 100 };
export const FUNDOS = [
  { id: 'vinho', rotulo: 'Vinho (padrão da marca)' },
  { id: 'escuro', rotulo: 'Vinho bem escuro' },
  { id: 'ouro', rotulo: 'Dourado' },
  { id: 'rosa', rotulo: 'Rosa claro' },
];

/** Link válido: caminho da loja (uma única barra no começo) ou https sem usuário e senha. */
export function linkValido(valor) {
  const v = String(valor ?? '').trim();
  if (!v) return true;
  if (/^\/(?!\/)[^\s<>"'\\]*$/.test(v)) return true;

  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}

/** ISO do servidor -> valor do campo datetime-local (hora local, sem segundos). */
export function isoParaCampo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Valor do campo datetime-local -> ISO (ou null se vazio/inválido). */
export function campoParaIso(valor) {
  if (!valor) return null;
  const d = new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formDoBanner(b) {
  return {
    rotulo: b?.rotulo ?? '', titulo: b?.titulo ?? '', destaque: b?.destaque ?? '', subtitulo: b?.subtitulo ?? '',
    botao_texto: b?.botao_texto ?? '', link: b?.link ?? '', rodape_texto: b?.rodape_texto ?? '',
    fundo: b?.fundo ?? 'vinho', usa_retrato: Boolean(b?.usa_retrato),
    inicio_em: isoParaCampo(b?.inicio_em), fim_em: isoParaCampo(b?.fim_em),
  };
}

/** Corpo do PATCH: texto aparado e vazio vira null (limpa o campo). */
export function montarCorpoBanner(form) {
  const t = (v) => String(v ?? '').trim() || null;

  return {
    rotulo: t(form.rotulo), titulo: t(form.titulo), destaque: t(form.destaque), subtitulo: t(form.subtitulo),
    botao_texto: t(form.botao_texto), link: t(form.link), rodape_texto: t(form.rodape_texto),
    fundo: form.fundo || 'vinho', usa_retrato: Boolean(form.usa_retrato),
    inicio_em: campoParaIso(form.inicio_em), fim_em: campoParaIso(form.fim_em),
  };
}

/** O que a faixa mostraria (para decidir se pode ser ativada): algum texto, imagem ou o retrato do dia. */
export function temConteudo(form, banner) {
  return Boolean(
    form.usa_retrato || String(form.titulo).trim() || String(form.destaque).trim() || String(form.subtitulo).trim()
    || banner?.imagem_esquerda || banner?.imagem_direita || banner?.imagem_centro,
  );
}

/** Mensagem do primeiro problema do formulário, ou '' se estiver ok. */
export function validarBanner(form) {
  for (const [campo, limite] of Object.entries(LIMITES_BANNER)) {
    if (String(form[campo] ?? '').trim().length > limite) return `O campo "${campo.replace(/_/g, ' ')}" passou de ${limite} caracteres.`;
  }

  if (!linkValido(form.link)) return 'Link inválido: use um caminho da loja (ex.: /produtos) ou um endereço começando com https://';
  if (String(form.botao_texto ?? '').trim() && !String(form.link ?? '').trim()) return 'O botão precisa de um link.';

  const ini = campoParaIso(form.inicio_em);
  const fim = campoParaIso(form.fim_em);
  if (form.inicio_em && !ini) return 'Data de início inválida.';
  if (form.fim_em && !fim) return 'Data de fim inválida.';
  if (ini && fim && new Date(fim) <= new Date(ini)) return 'A data de fim deve ser depois da de início.';

  return '';
}

/** Situação da faixa para a lista: aparece agora, agendada, encerrada, desligada. */
export function situacaoDoBanner(b, agora = new Date()) {
  if (!b.ativo) return { rotulo: 'Desligada', tom: 'neutro' };
  if (b.inicio_em && new Date(b.inicio_em) > agora) return { rotulo: 'Agendada', tom: 'aviso' };
  if (b.fim_em && new Date(b.fim_em) <= agora) return { rotulo: 'Encerrada', tom: 'aviso' };
  return { rotulo: 'Aparece na Home', tom: 'ok' };
}
