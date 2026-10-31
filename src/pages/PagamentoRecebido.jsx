import { useSearchParams } from 'react-router-dom';
import { TEXTOS_RESULTADO, textoDoResultado } from '../utils/pagamentoRecebido';
import './PagamentoRecebido.css';

// Página pública (sem login) para onde o Mercado Pago devolve o cliente depois de pagar o link de cartão.
// É só informativa: o resultado na URL NÃO confirma pagamento nenhum (qualquer pessoa pode digitá-lo). Quem
// confirma é o backend, por webhook/consulta ao Mercado Pago; esta página não chama API nem guarda nada.
export function PagamentoRecebidoView({ resultado }) {
  const { titulo, texto } = textoDoResultado(resultado);

  return (
    <main className="pagamento-recebido">
      <section className={`pagamento-recebido-card pagamento-recebido-${TEXTOS_RESULTADO[resultado] ? resultado : 'neutro'}`}>
        <h1>{titulo}</h1>
        <p>{texto}</p>
      </section>
    </main>
  );
}

export default function PagamentoRecebido() {
  const [params] = useSearchParams();
  return <PagamentoRecebidoView resultado={params.get('resultado')} />;
}
