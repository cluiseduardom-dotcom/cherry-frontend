import { useCallback, useEffect, useState } from 'react';
import { sessaoAtual } from '../services/caixa';
import { caixaLigado, estadoDoCaixaNoPdv } from '../utils/caixa';

// Situação do caixa do usuário no PDV. Sem a funcionalidade `caixa` não consulta nada e não bloqueia a venda (comportamento de
// antes). Reconsulta ao voltar o foco para a janela (o usuário pode ter aberto o caixa em outra aba). O servidor decide de novo:
// sem caixa aberto a venda volta 409, então uma falha na consulta nunca trava a tela.
export function useCaixaPdv(user) {
  const ligado = caixaLigado(user);
  const [sessao, setSessao] = useState(null);
  const [carregando, setCarregando] = useState(ligado);
  const [erro, setErro] = useState('');
  const [versao, setVersao] = useState(0);

  const recarregar = useCallback(() => setVersao((n) => n + 1), []);

  useEffect(() => {
    if (!ligado) return undefined;

    let cancelado = false;

    sessaoAtual()
      .then((s) => { if (!cancelado) { setSessao(s); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'erro'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [ligado, versao]);

  useEffect(() => {
    if (!ligado) return undefined;

    window.addEventListener('focus', recarregar);

    return () => window.removeEventListener('focus', recarregar);
  }, [ligado, recarregar]);

  return { ...estadoDoCaixaNoPdv({ ligado, carregando, erro, sessao }), recarregar };
}
