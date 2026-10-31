import { useSearchParams } from 'react-router-dom';
import { TEXTOS_RESULTADO, textoDoResultado, podeVoltarAoPagamento } from '../utils/pagamentoRecebido';
import './PagamentoRecebido.css';

// Página pública (sem login) para onde o Mercado Pago devolve o cliente depois de pagar o link de cartão.
// É só informativa: o resultado na URL NÃO confirma pagamento nenhum (qualquer pessoa pode digitá-lo). Quem
// confirma é o backend, por webhook/consulta ao Mercado Pago; esta página não chama API nem guarda nada.
export function PagamentoRecebidoView({ resultado, onVoltar }) {
  const { titulo, texto } = textoDoResultado(resultado);

  return (
    <main className="pagamento-recebido">
      <section className={`pagamento-recebido-card pagamento-recebido-${TEXTOS_RESULTADO[resultado] ? resultado : 'neutro'}`}>
        <h1>{titulo}</h1>
        <p>{texto}</p>
        {onVoltar && podeVoltarAoPagamento(resultado) && (
          <button type="button" className="pagamento-recebido-voltar" onClick={onVoltar}>
            Voltar ao pagamento
          </button>
        )}
      </section>
    </main>
  );
}

export default function PagamentoRecebido() {
  const [params] = useSearchParams();
  // Volta para a tela anterior (o checkout do Mercado Pago, que segue válido até o link expirar).
  // Sem histórico (página aberta direto) não há para onde voltar: o botão nem aparece.
  const podeVoltar = typeof window !== 'undefined' && window.history.length > 1;
  return <PagamentoRecebidoView resultado={params.get('resultado')} onVoltar={podeVoltar ? () => window.history.back() : undefined} />;
}
