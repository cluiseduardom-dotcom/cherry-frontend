import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import PixQrCobranca from './PixQrCobranca';
import { consultarCobrancaPix, criarCobrancaPixParaReceber } from '../services/pagamentosGateway';
import { pagamentoComCobranca } from '../utils/pixGateway';
import { lerValor, valorParaCampo } from '../utils/fiado';
import { resultadoDoPixPago, validarValorPix } from '../utils/pixReceber';
import { formatarMoeda } from '../utils/mascaras';
import './ProductModal.css';

const TENTATIVAS_CONFIRMACAO = 5;
const ESPERA_CONFIRMACAO_MS = 2000;

// Receber por Pix (fiado da Colheita ou parcela do crediário): escolhe o valor (até o que falta), mostra o QR / "copia e cola" /
// WhatsApp e acompanha o pagamento. Quem dá a baixa é o SERVIDOR, quando o Mercado Pago confirma: fechar esta janela não perde o
// recebimento. O pai só monta o modal quando há algo a receber (cada abertura começa limpa).
export default function ReceberPixModal({ titulo, subtitulo, destino, maximo, telefone, onClose, onConcluido }) {
  const [valor, setValor] = useState(valorParaCampo(maximo));
  const [cobranca, setCobranca] = useState(null);
  const [recebidoEm, setRecebidoEm] = useState(0);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');
  const [resultado, setResultado] = useState(null);
  const ultima = useRef(null);
  const ativo = useRef(true);

  useEffect(() => {
    ativo.current = true;
    return () => { ativo.current = false; };
  }, []);

  // Guarda a última leitura da cobrança: ao pagar, ela diz se o servidor já lançou o recebimento.
  const consultar = useCallback(async (codigo) => {
    const lida = await consultarCobrancaPix(codigo);
    ultima.current = lida;
    return lida;
  }, []);

  async function gerar(e) {
    e.preventDefault();

    if (gerando) return;

    const problema = validarValorPix(valor, maximo);

    if (problema) { setErro(problema); return; }

    setGerando(true);
    setErro('');

    try {
      const criada = await criarCobrancaPixParaReceber(lerValor(valor), destino);

      ultima.current = criada;
      setRecebidoEm(Date.now());
      setCobranca(criada);
    } catch (err) {
      setErro(err.message || 'Não foi possível gerar o Pix.');
    } finally {
      setGerando(false);
    }
  }

  async function aoPagar() {
    let atual = resultadoDoPixPago(ultima.current);

    // Pago, mas o servidor ainda está lançando: consulta de novo algumas vezes antes de desistir de esperar.
    for (let i = 0; i < TENTATIVAS_CONFIRMACAO && atual.situacao === 'aguardando'; i += 1) {
      await new Promise((r) => setTimeout(r, ESPERA_CONFIRMACAO_MS));
      if (!ativo.current) return;
      try { await consultar(cobranca.codigo); } catch { /* tenta de novo */ }
      atual = resultadoDoPixPago(ultima.current);
    }

    if (!ativo.current) return;
    setResultado(atual);
    if (atual.situacao === 'aplicado') onConcluido?.();
  }

  function aoExpirar() {
    setCobranca(null);
    setErro('O Pix expirou sem ser pago. Gere outro se o cliente ainda for pagar.');
  }

  const pagamento = cobranca ? pagamentoComCobranca({}, cobranca, recebidoEm) : null;

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && !gerando && onClose()}>
      <div className="modal-panel card" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="receber-pix-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="receber-pix-titulo">{titulo}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>

        <div className="modal-body">
          {subtitulo ? <p className="text-sm text-secondary" style={{ margin: '0 0 var(--space-3)' }}>{subtitulo}</p> : null}

          {erro && (
            <div className="modal-error" role="alert">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}><AlertCircle size={16} /><span>{erro}</span></div>
            </div>
          )}

          {resultado ? (
            <p role="status" style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
              {resultado.situacao === 'aplicado' ? <CheckCircle2 size={18} aria-hidden="true" /> : <AlertCircle size={18} aria-hidden="true" />}
              <span>{resultado.mensagem}</span>
            </p>
          ) : pagamento ? (
            <>
              <p style={{ margin: '0 0 var(--space-3)' }}>Pix de <strong>{formatarMoeda(cobranca.valor)}</strong></p>
              <PixQrCobranca pagamento={pagamento} consultar={consultar} onPago={aoPagar} onEncerrada={aoExpirar} clienteTelefone={telefone} />
              <p className="text-sm text-secondary" style={{ marginTop: 'var(--space-3)' }}>
                O cliente paga pelo app do banco. Quando o Pix cair, o recebimento é lançado sozinho, mesmo que você feche esta janela.
              </p>
            </>
          ) : (
            <form onSubmit={gerar} noValidate id="receber-pix-form">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="receber-pix-valor">Valor do Pix (R$)</label>
                <input id="receber-pix-valor" className="input-field" type="text" inputMode="decimal" value={valor} onChange={(e) => { setErro(''); setValor(e.target.value); }} disabled={gerando} autoFocus />
                <small className="text-secondary">Falta receber {formatarMoeda(maximo)}. Pode ser um valor menor (pagamento parcial).</small>
              </div>
            </form>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{resultado ? 'Fechar' : 'Cancelar'}</button>
          {!pagamento && !resultado && (
            <button type="submit" form="receber-pix-form" className="btn btn-primary" disabled={gerando}>{gerando ? 'Gerando…' : 'Gerar Pix'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
