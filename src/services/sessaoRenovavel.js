import { apiFetch } from './api';

// Renovação da sessão (par do backend: POST /auth/renovar). Regras puras e testáveis aqui; o efeito fica no AuthContext.
// O token curto (1 h, quando o servidor liga SESSAO_RENOVAVEL) é renovado enquanto a pessoa USA o sistema. Parada por
// mais que a janela de atividade, a sessão vence sozinha. O servidor impõe o teto de 8 h desde o login.

export const MARGEM_RENOVACAO_S = 20 * 60; // renova quando faltam menos de 20 min
export const JANELA_ATIVIDADE_S = 15 * 60; // "em uso" = houve ação nos últimos 15 min
export const TETO_SESSAO_S = 8 * 60 * 60; // igual ao servidor
export const ESPERA_APOS_FALHA_S = 5 * 60;

// Lê exp e sa do token SEM verificar assinatura (quem confere é o servidor); serve só para decidir quando renovar.
export function lerTempos(token) {
  try {
    const parte = String(token).split('.')[1];
    const json = JSON.parse(atob(parte.replace(/-/g, '+').replace(/_/g, '/')));
    if (!Number.isFinite(json.exp)) return null;

    return { exp: json.exp, sa: Number.isFinite(json.sa) ? json.sa : null };
  } catch {
    return null;
  }
}

/**
 * Deve renovar agora? Só se: o token vai vencer em breve, ainda não venceu, a pessoa está usando o sistema, não houve
 * falha recente e renovar de fato ganha tempo (token já no teto da sessão não adianta renovar).
 */
export function decidirRenovacao({ tempos, agora, ultimaAtividade, ultimaFalha = null }) {
  if (!tempos) return false;

  const { exp, sa } = tempos;
  if (exp <= agora) return false;
  if (exp - agora >= MARGEM_RENOVACAO_S) return false;
  if (agora - ultimaAtividade >= JANELA_ATIVIDADE_S) return false;
  if (ultimaFalha !== null && agora - ultimaFalha < ESPERA_APOS_FALHA_S) return false;
  if (sa !== null && exp >= sa + TETO_SESSAO_S - 60) return false;

  return true;
}

export async function renovarSessao() {
  const body = await apiFetch('/auth/renovar', { method: 'POST', skipAuthRedirect: true });
  return (body?.data ?? body)?.token ?? null;
}
