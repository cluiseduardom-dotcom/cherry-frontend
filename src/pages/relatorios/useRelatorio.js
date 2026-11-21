import { useEffect, useRef, useState } from 'react';

/**
 * Carrega um relatório sempre que `chave` muda. `chave === null` = não carregar (ex.: período inválido).
 * Nunca chama setState de forma síncrona no efeito: "carregando" é derivado de a chave do resultado já
 * guardado ser diferente da chave atual, então uma resposta antiga nunca aparece para filtros novos.
 */
export function useRelatorio(chave, carregar) {
  const [resultado, setResultado] = useState({ chave: null, dados: null, erro: '' });
  const carregarRef = useRef(carregar);

  useEffect(() => {
    carregarRef.current = carregar;
  });

  useEffect(() => {
    if (chave === null) return undefined;
    let cancelado = false;

    carregarRef.current()
      .then(dados => {
        if (!cancelado) setResultado({ chave, dados, erro: '' });
      })
      .catch(erro => {
        if (!cancelado) setResultado({ chave, dados: null, erro: erro?.message || 'Erro ao carregar o relatório' });
      });

    return () => {
      cancelado = true;
    };
  }, [chave]);

  const carregando = chave !== null && resultado.chave !== chave;

  return {
    carregando,
    dados: chave === null || carregando ? null : resultado.dados,
    erro: chave === null || carregando ? '' : resultado.erro,
  };
}
