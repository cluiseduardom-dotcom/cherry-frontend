import { podeComCapacidade } from '../config/access';
import { lerValor } from './fiado';

// Regras de tela do caixa, sem React. O backend valida de novo e calcula o esperado: aqui só se avisa antes de enviar.

export const FORMAS_CAIXA = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'Pix' },
  { valor: 'debito', rotulo: 'Débito' },
  { valor: 'credito', rotulo: 'Crédito' },
  { valor: 'crediario', rotulo: 'Crediário' },
];

export const TIPOS_MOVIMENTO = [
  { valor: 'suprimento', rotulo: 'Suprimento', dica: 'Dinheiro colocado no caixa (ex.: troco extra).' },
  { valor: 'sangria', rotulo: 'Sangria', dica: 'Dinheiro retirado do caixa (ex.: levado ao cofre).' },
];

export const VALOR_MAXIMO = 999999.99;
export const LIMITE_MOTIVO = 300;
export const LIMITE_JUSTIFICATIVA = 500;

export const rotuloForma = (forma) => FORMAS_CAIXA.find((f) => f.valor === forma)?.rotulo ?? forma;
export const rotuloTipo = (tipo) => TIPOS_MOVIMENTO.find((t) => t.valor === tipo)?.rotulo ?? tipo;

// A empresa tem a funcionalidade `caixa`? Aqui a lista AUSENTE conta como "não": o PDV só exige caixa quando se sabe que está ligado.
export function caixaLigado(user) {
  return Boolean(user) && Array.isArray(user.funcionalidades) && user.funcionalidades.includes('caixa');
}

export const podeOperarCaixa = (user) => podeComCapacidade(user, 'operar_caixa');
export const podeGerirCaixas = (user) => podeComCapacidade(user, 'gerir_caixas');

function problemaDoValor(valor, { permiteZero }) {
  if (valor === null || Number.isNaN(valor)) return 'Informe o valor em reais (ex.: 25 ou 25,90).';
  if (valor < 0 || (!permiteZero && valor === 0)) return permiteZero ? 'O valor não pode ser negativo.' : 'O valor deve ser maior que zero.';
  if (valor > VALOR_MAXIMO) return 'O valor máximo é R$ 999.999,99.';

  return null;
}

/** Primeiro problema da abertura, ou null. O saldo inicial (troco) pode ser zero. */
export function validarAbertura({ caixaId, saldo }) {
  if (!caixaId) return 'Escolha o caixa.';

  return problemaDoValor(lerValor(saldo), { permiteZero: true });
}

/** Primeiro problema do movimento, ou null. `dinheiroEmCaixa` (opcional) barra a sangria maior que o dinheiro: o servidor também barra. */
export function validarMovimento({ tipo, valor, motivo }, dinheiroEmCaixa = null) {
  if (!TIPOS_MOVIMENTO.some((t) => t.valor === tipo)) return 'Escolha suprimento ou sangria.';

  const v = lerValor(valor);
  const problema = problemaDoValor(v, { permiteZero: false });

  if (problema) return problema;
  if (String(motivo ?? '').trim().length < 3) return 'Informe o motivo (mínimo 3 caracteres).';
  if (String(motivo).trim().length > LIMITE_MOTIVO) return `O motivo deve ter no máximo ${LIMITE_MOTIVO} caracteres.`;
  if (tipo === 'sangria' && dinheiroEmCaixa !== null && v > dinheiroEmCaixa) return 'A sangria é maior que o dinheiro em caixa.';

  return null;
}

/** Formas a conferir no fechamento: o dinheiro sempre, mais toda forma que o servidor informa em `esperado`. Na ordem das FORMAS_CAIXA. */
export function formasParaConferir(esperado) {
  const comMovimento = new Set(['dinheiro', ...Object.keys(esperado ?? {})]);

  return FORMAS_CAIXA.filter((f) => comMovimento.has(f.valor)).map((f) => f.valor);
}

/** Linhas da conferência: esperado (do servidor), o que foi contado e a diferença; `invalido` = campo vazio ou ilegível. */
export function montarConferencia(esperado, informados) {
  return formasParaConferir(esperado).map((forma) => {
    const lido = lerValor(informados?.[forma]);
    const invalido = lido === null || Number.isNaN(lido) || lido < 0 || lido > VALOR_MAXIMO;
    const esp = Number(esperado?.[forma] ?? 0);

    return {
      forma,
      esperado: esp,
      informado: invalido ? null : lido,
      diferenca: invalido ? null : Math.round((lido - esp) * 100) / 100,
      invalido,
    };
  });
}

export const temDiferenca = (linhas) => linhas.some((l) => !l.invalido && l.diferenca !== 0);

/** Primeiro problema do fechamento, ou null. Diferença exige justificativa (o caixa fecha mesmo assim, sem aprovação de gerente). */
export function validarFechamento(linhas, justificativa) {
  if (linhas.some((l) => l.invalido)) return 'Informe o valor contado de cada forma (use 0 se não houve).';
  if (temDiferenca(linhas) && String(justificativa ?? '').trim().length < 3) return 'Há diferença na conferência: explique o motivo (mínimo 3 caracteres).';
  if (String(justificativa ?? '').trim().length > LIMITE_JUSTIFICATIVA) return `A justificativa deve ter no máximo ${LIMITE_JUSTIFICATIVA} caracteres.`;

  return null;
}

/** Corpo do fechamento: só forma e valor contado (o esperado nunca vai; o servidor calcula). Justificativa só quando há diferença. */
export function corpoFechamento(linhas, justificativa) {
  const texto = String(justificativa ?? '').trim();

  return {
    conferencia: linhas.map((l) => ({ forma: l.forma, informado: l.informado })),
    ...(temDiferenca(linhas) && texto ? { justificativa: texto } : {}),
  };
}

/** O que o PDV mostra e se bloqueia a venda. `estado`: { ligado, carregando, erro, sessao }. Sem a funcionalidade, nada muda. */
export function estadoDoCaixaNoPdv({ ligado, carregando, erro, sessao }) {
  if (!ligado) return { visivel: false, bloqueia: false, mensagem: '' };
  if (carregando) return { visivel: true, bloqueia: false, mensagem: 'Verificando o caixa...' };
  // Falha ao consultar: não trava a venda na tela (o servidor decide e responde 409 se o caixa não estiver aberto).
  if (erro) return { visivel: true, bloqueia: false, mensagem: 'Não foi possível verificar o caixa. O sistema confere de novo ao finalizar.' };
  if (!sessao) return { visivel: true, bloqueia: true, mensagem: 'Caixa fechado. Abra o caixa para vender.' };

  return { visivel: true, bloqueia: false, mensagem: `Caixa aberto: ${sessao.sessao.caixa_nome}` };
}

export function horaBr(iso) {
  if (!iso) return '';
  const data = new Date(iso);

  return Number.isNaN(data.getTime()) ? '' : data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}
