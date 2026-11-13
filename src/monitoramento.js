// Coleta de erros do navegador (Sentry), OPCIONAL: só liga com VITE_SENTRY_DSN no build. Sem ela, nada é carregado
// nem enviado. A biblioteca é baixada depois da tela abrir (import dinâmico), para não pesar na abertura do sistema.
// Privacidade: sem usuário, sem IP, sem corpo/cabeçalhos/cookies, sem breadcrumbs (cliques, requisições e logs) e sem
// replay de tela; URLs perdem a query string; mensagens passam por máscara de e-mail, CPF, CNPJ, telefone e token.
const MAX_MENSAGEM = 300;

const MASCARAS = [
  [/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, 'Bearer [token]'],
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]'],
  [/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[cpf]'],
  [/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g, '[cnpj]'],
  [/\(?\b\d{2}\)?\s?9?\d{4}[-\s]?\d{4}\b/g, '[telefone]'],
];

export function mascarar(texto) {
  if (typeof texto !== 'string') return texto;

  let saida = texto;
  for (const [regra, troca] of MASCARAS) saida = saida.replace(regra, troca);

  return saida.length > MAX_MENSAGEM ? `${saida.slice(0, MAX_MENSAGEM)}…` : saida;
}

const semQuery = (url) => (typeof url === 'string' ? url.split('?')[0].split('#')[0] : url);

export function limparEvento(evento) {
  if (!evento || typeof evento !== 'object') return evento;

  const limpo = { ...evento };

  if (limpo.request) limpo.request = { url: semQuery(limpo.request.url) };
  delete limpo.user;
  delete limpo.extra;
  limpo.breadcrumbs = [];
  if (limpo.message) limpo.message = mascarar(limpo.message);

  if (limpo.exception?.values) {
    limpo.exception = {
      ...limpo.exception,
      values: limpo.exception.values.map((v) => ({ ...v, value: mascarar(v.value) })),
    };
  }

  return limpo;
}

export async function iniciarMonitoramento(env = import.meta.env) {
  const dsn = typeof env.VITE_SENTRY_DSN === 'string' ? env.VITE_SENTRY_DSN.trim() : '';

  if (!dsn) return false;

  const Sentry = await import('@sentry/react');

  Sentry.init({
    dsn,
    environment: env.MODE,
    sendDefaultPii: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    beforeSend: limparEvento,
  });

  return true;
}
