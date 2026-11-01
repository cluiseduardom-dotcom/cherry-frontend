// Identidade visual por cliente: regras puras da tela do operador da plataforma.
// O backend valida de verdade (formato, reservados, duplicidade); aqui só se evita ida e volta inútil.

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

// Mesmos nomes reservados do backend (src/constants/temasVisuais.js).
export const SLUGS_RESERVADOS = ['app', 'www', 'api', 'admin', 'plataforma', 'login', 'staging', 'vertumno', 'gironex'];

export const ROTULO_TEMA = {
  vertumno: 'VERTUMNO (padrão da plataforma)',
  cherry: 'Cherry Semijoias',
  valvazori: 'Valvazori Imports',
};

export function rotuloTema(tema) {
  return ROTULO_TEMA[tema] || String(tema ?? '—');
}

export function normalizarSlug(valor) {
  return String(valor ?? '').trim().toLowerCase();
}

// Endereço público da tela de login da marca (ex.: https://app.vertumno.com.br/c/cherry).
export function linkDaMarca(origem, slug) {
  if (!slug) return '';
  return `${String(origem ?? '').replace(/\/+$/, '')}/c/${slug}`;
}

// form: { tema_visual, slug } (slug em branco = sem endereço); atual: { tema_visual, slug }.
// Devolve { valido, erros, corpo } — corpo só com o que mudou, ou null se nada mudou.
export function validarIdentidade(form, atual) {
  const erros = {};
  const slug = normalizarSlug(form.slug);
  const slugAtual = atual.slug ?? '';

  if (slug && !SLUG_RE.test(slug)) {
    erros.slug = 'Use letras minúsculas, números e hífen (2 a 40 caracteres, sem começar nem terminar em hífen).';
  } else if (slug && SLUGS_RESERVADOS.includes(slug)) {
    erros.slug = 'Este nome é reservado para a plataforma.';
  }

  if (Object.keys(erros).length) return { valido: false, erros, corpo: null };

  const corpo = {};
  if (form.tema_visual !== atual.tema_visual) corpo.tema_visual = form.tema_visual;
  if (slug !== slugAtual) corpo.slug = slug || null;

  return { valido: true, erros: {}, corpo: Object.keys(corpo).length ? corpo : null };
}

export function descreverMudancaIdentidade(empresa, corpo, origem) {
  const partes = [];
  if ('tema_visual' in corpo) partes.push(`o tema passa a ser "${rotuloTema(corpo.tema_visual)}"`);
  if ('slug' in corpo) {
    partes.push(corpo.slug
      ? `o endereço passa a ser ${linkDaMarca(origem, corpo.slug)} (o endereço antigo deixa de funcionar)`
      : 'o endereço da marca é removido (o link antigo deixa de funcionar)');
  }
  return `${empresa}: ${partes.join('; ')}. A mudança vale para a tela de login e para todos os usuários da empresa.`;
}

// Data/hora (timestamp ISO do backend) no fuso de Brasília.
export function formatarDataHora(iso) {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
}
