import { useEffect } from 'react';

// Quando um envio falha (erro do servidor ou de validação) num modal com rolagem, leva o erro à tela:
// sem isso o usuário clica em "Salvar", nada parece acontecer e o aviso fica fora da área visível.
// `ref` aponta para o painel do modal; `sinal` é um contador que o modal incrementa a cada envio
// que falhou (não reage à digitação, para não rolar a tela enquanto a pessoa corrige outro campo).
export function useRolarParaErro(ref, sinal) {
  useEffect(() => {
    if (!sinal) return;
    const alvo = ref.current?.querySelector('.modal-error, .campo-erro');
    alvo?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  }, [ref, sinal]);
}
