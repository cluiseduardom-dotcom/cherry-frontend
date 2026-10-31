import { useEffect, useState } from 'react';
import { Copy, ExternalLink, MessageCircle } from 'lucide-react';
import { consultarCobrancaPix } from '../services/pagamentosGateway';
import { linkWhatsApp, situacaoLinkCartao, tempoRestante } from '../utils/pixGateway';
import { formatarMoeda } from '../utils/mascaras';
import useAcompanharCobranca from '../hooks/useAcompanharCobranca';
import './LinkCartaoCobranca.css';

// Parte visual, sem efeitos: recebe tudo por props (testável sem DOM).
export function LinkCartaoPainel({ url, valor, parcelasMaximas, restante, copiado, onCopiar }) {
  return (
    <div className="link-cartao" role="group" aria-label="Link de pagamento de cartão">
      <p className="link-cartao-status" role="status" aria-live="polite">
        Aguardando o cliente pagar no cartão…
        {restante && <small> Válido por {restante}</small>}
      </p>
      <p className="link-cartao-dica">
        Envie o link ao cliente: ele escolhe crédito{parcelasMaximas > 1 ? ` (até ${parcelasMaximas}x)` : ''} ou débito na página do Mercado Pago.
      </p>
      {url && (
        <div className="link-cartao-acoes">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCopiar}>
            <Copy size={14} aria-hidden="true" /> {copiado ? 'Link copiado' : 'Copiar link'}
          </button>
          <a className="btn btn-secondary btn-sm" href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={14} aria-hidden="true" /> Abrir link
          </a>
          <a className="btn btn-secondary btn-sm" href={linkWhatsApp(url, formatarMoeda(valor))} target="_blank" rel="noopener noreferrer">
            <MessageCircle size={14} aria-hidden="true" /> WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}

// Mostra o link e acompanha o pagamento: ao pagar, converte a linha em crédito/débito com as parcelas
// lidas do Mercado Pago (onPago recebe a cobrança); ao expirar/cancelar, marca como recusado.
export default function LinkCartaoCobranca({ pagamento, consultar = consultarCobrancaPix, onPago, onEncerrada, intervaloMs = 4000 }) {
  const [agora, setAgora] = useState(() => Date.now());
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  useAcompanharCobranca({
    codigo: pagamento.cobranca_codigo,
    consultar,
    onPago,
    onEncerrada,
    intervaloMs,
    situacao: situacaoLinkCartao,
  });

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pagamento.link?.url ?? '');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <LinkCartaoPainel
      url={pagamento.link?.url}
      valor={pagamento.valor}
      parcelasMaximas={pagamento.link?.parcelas_maximas}
      restante={tempoRestante(pagamento.link?.expira_em, agora, pagamento.link?.expira_em_segundos, pagamento.link?.recebido_em)}
      copiado={copiado}
      onCopiar={copiar}
    />
  );
}
