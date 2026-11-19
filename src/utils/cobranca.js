// Aviso de cobrança do teste grátis / pagamento, só para a pessoa saber o que vem. Quem barra a gravação é o backend
// (somente leitura = 403); aqui só se explica. `cobranca` vem de GET /auth/me: { situacao, ate } | null.
// null/ausente = empresa sem regra de cobrança (nada a avisar). Isenta nunca é avisada.
import { hojeBrasilia } from './bancos';

// Avisa o teste só na reta final e o pagamento perto de vencer, para não poluir a tela durante o uso normal.
export const DIAS_AVISO_TESTE = 7;
export const DIAS_AVISO_PAGAMENTO = 5;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

// Dias entre hoje e o último dia coberto (0 = termina hoje); null se alguma data for inválida.
export function diasAte(ate, hoje) {
  if (!ISO.test(ate ?? '') || !ISO.test(hoje ?? '')) return null;
  return Math.round((Date.parse(`${ate}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 86400000);
}

export function formatarDataCurta(iso) {
  if (!ISO.test(iso ?? '')) return '';
  const [ano, mes, dia] = iso.split('-');
  return `${dia}/${mes}/${ano}`;
}

function quando(dias) {
  if (dias === 0) return 'termina hoje';
  if (dias === 1) return 'termina amanhã';
  return `termina em ${dias} dias`;
}

// → null (nada a mostrar) ou { tom: 'aviso' | 'erro', titulo, texto }.
export function avisoCobranca(cobranca, hoje = hojeBrasilia()) {
  const situacao = cobranca?.situacao;
  if (!situacao) return null;

  if (situacao === 'somente_leitura') {
    return {
      tom: 'erro',
      titulo: 'Período de uso encerrado',
      texto: 'Sua conta está somente para consulta: você vê tudo, mas não consegue registrar novidades. Fale com a GiroNex para ativar o seu plano.',
    };
  }

  const dias = diasAte(cobranca.ate, hoje);
  if (dias === null || dias < 0) return null;

  if (situacao === 'em_teste' && dias <= DIAS_AVISO_TESTE) {
    return {
      tom: 'aviso',
      titulo: `Seu teste grátis ${quando(dias)}`,
      texto: `O último dia grátis é ${formatarDataCurta(cobranca.ate)}. Depois dessa data, a cobrança do seu plano é ativada e, sem o pagamento, a conta passa a ser somente para consulta.`,
    };
  }

  if (situacao === 'ativa' && dias <= DIAS_AVISO_PAGAMENTO) {
    return {
      tom: 'aviso',
      titulo: `Seu plano ${quando(dias).replace('termina', 'vence')}`,
      texto: `O pagamento cobre até ${formatarDataCurta(cobranca.ate)}. Para continuar usando normalmente, combine a renovação com a GiroNex.`,
    };
  }

  return null;
}
