import { useEffect, useRef } from 'react';
import { situacaoCobranca } from '../utils/pixGateway';

// Acompanha uma cobrança do Mercado Pago (Pix ou link de cartão) consultando o backend a cada
// `intervaloMs`: ao pagar, chama onPago(cobranca); ao expirar/cancelar, chama onEncerrada().
// Erros de rede na consulta são ignorados (a próxima rodada tenta de novo). `situacao` decide o
// estado da cobrança consultada (aguardando | pago | encerrada).
export default function useAcompanharCobranca({
  codigo, consultar, onPago, onEncerrada, intervaloMs = 4000, situacao = situacaoCobranca,
}) {
  const aoPagar = useRef(onPago);
  const aoEncerrar = useRef(onEncerrada);

  useEffect(() => {
    aoPagar.current = onPago;
    aoEncerrar.current = onEncerrada;
  }, [onPago, onEncerrada]);

  useEffect(() => {
    let ativo = true;
    let timer = null;

    async function rodada() {
      try {
        const cobranca = await consultar(codigo);
        const estado = situacao(cobranca);
        if (!ativo) return;
        if (estado === 'pago') { aoPagar.current?.(cobranca); return; }
        if (estado === 'encerrada') { aoEncerrar.current?.(cobranca); return; }
      } catch {
        // falha momentânea de rede: tenta na próxima rodada
      }
      if (ativo) timer = setTimeout(rodada, intervaloMs);
    }

    timer = setTimeout(rodada, intervaloMs);
    return () => { ativo = false; clearTimeout(timer); };
  }, [codigo, consultar, intervaloMs, situacao]);
}
