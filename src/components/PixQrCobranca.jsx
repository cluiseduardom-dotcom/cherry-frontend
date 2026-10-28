import { useEffect, useRef, useState } from 'react';
import { Copy, QrCode } from 'lucide-react';
import { consultarCobrancaPix } from '../services/pagamentosGateway';
import { situacaoCobranca, tempoRestante } from '../utils/pixGateway';
import './PixQrCobranca.css';

// Parte visual, sem efeitos: recebe tudo por props (testável sem DOM).
export function PixQrPainel({ qrCode, qrCodeBase64, restante, copiado, onCopiar }) {
  return (
    <div className="pix-qr" role="group" aria-label="Pix com QR code">
      {qrCodeBase64 ? (
        <img className="pix-qr-imagem" src={`data:image/png;base64,${qrCodeBase64}`} alt="QR code do Pix" />
      ) : (
        <div className="pix-qr-imagem pix-qr-imagem--vazia" aria-hidden="true"><QrCode size={40} /></div>
      )}
      <div className="pix-qr-info">
        <p className="pix-qr-status" role="status" aria-live="polite">
          Aguardando o pagamento do cliente…
          {restante && <small> Válido por {restante}</small>}
        </p>
        {qrCode && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={onCopiar}>
            <Copy size={14} aria-hidden="true" /> {copiado ? 'Código copiado' : 'Copiar código Pix'}
          </button>
        )}
      </div>
    </div>
  );
}

// Mostra o QR da cobrança e acompanha o pagamento: ao pagar, confirma sozinho; ao expirar/cancelar,
// marca como recusado. Erros de rede na consulta são ignorados (a próxima rodada tenta de novo).
export default function PixQrCobranca({ pagamento, consultar = consultarCobrancaPix, onPago, onEncerrada, intervaloMs = 4000 }) {
  const [agora, setAgora] = useState(() => Date.now());
  const [copiado, setCopiado] = useState(false);
  const aoPagar = useRef(onPago);
  const aoEncerrar = useRef(onEncerrada);

  useEffect(() => {
    aoPagar.current = onPago;
    aoEncerrar.current = onEncerrada;
  }, [onPago, onEncerrada]);

  useEffect(() => {
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(relogio);
  }, []);

  const codigo = pagamento.cobranca_codigo;

  useEffect(() => {
    let ativo = true;
    let timer = null;

    async function rodada() {
      try {
        const situacao = situacaoCobranca(await consultar(codigo));
        if (!ativo) return;
        if (situacao === 'pago') { aoPagar.current?.(); return; }
        if (situacao === 'encerrada') { aoEncerrar.current?.(); return; }
      } catch {
        // falha momentânea de rede: tenta na próxima rodada
      }
      if (ativo) timer = setTimeout(rodada, intervaloMs);
    }

    timer = setTimeout(rodada, intervaloMs);
    return () => { ativo = false; clearTimeout(timer); };
  }, [codigo, consultar, intervaloMs]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pagamento.pix?.qr_code ?? '');
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setCopiado(false);
    }
  }

  return (
    <PixQrPainel
      qrCode={pagamento.pix?.qr_code}
      qrCodeBase64={pagamento.pix?.qr_code_base64}
      restante={tempoRestante(pagamento.pix?.expira_em, agora, pagamento.pix?.expira_em_segundos, pagamento.pix?.recebido_em)}
      copiado={copiado}
      onCopiar={copiar}
    />
  );
}
