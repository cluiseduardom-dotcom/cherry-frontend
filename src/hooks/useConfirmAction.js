import { useCallback, useState } from 'react';

// UX-05 (Issue #50): generaliza o padrão "window.confirm(...) ? ação : nada"
// para o ConfirmDialog acessível. Extraída como função pura pelo mesmo
// motivo de useConfirmarFechamentoModal (Issue #42) — o projeto não tem
// jsdom/React Testing Library para renderizar o hook de verdade, então a
// única parte com alguma decisão fica isolada e testável sem DOM.
//
// Regra fundamental: cancelar/fechar o diálogo NUNCA chama aoConfirmar —
// só confirmar() chama. A ação em si roda de forma síncrona ao fechar o
// diálogo (não espera a Promise), no mesmo instante em que window.confirm()
// resolvia com true — o próprio handler da tela continua controlando seus
// estados de loading/erro exatamente como antes.
export function aoConfirmar(acaoPendente) {
  acaoPendente?.execute();
}

export function useConfirmAction() {
  const [acaoPendente, setAcaoPendente] = useState(null);

  const pedirConfirmacao = useCallback(acao => {
    setAcaoPendente(acao);
  }, []);

  const confirmar = useCallback(() => {
    setAcaoPendente(current => {
      aoConfirmar(current);
      return null;
    });
  }, []);

  const cancelar = useCallback(() => {
    setAcaoPendente(null);
  }, []);

  return { acaoPendente, pedirConfirmacao, confirmar, cancelar };
}
