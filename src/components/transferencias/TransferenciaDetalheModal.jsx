import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  obterTransferencia, aceitarTransferencia, recusarTransferencia, cancelarTransferencia,
} from '../../services/transferenciasEstoque';
import {
  STATUS_ROTULO, STATUS_BADGE, ROTULO_ACAO, acoesPermitidas, validarMotivo, totalDeUnidades,
} from '../../utils/transferencias';
import { formatarDataHora } from '../../utils/formatarData';
import { useConfirmarFechamentoModal } from '../../hooks/useConfirmarFechamentoModal';
import '../ProductModal.css';
import './Transferencias.css';

const TITULO_MOTIVO = { recusar: 'Recusar transferência', cancelar: 'Cancelar transferência' };

export default function TransferenciaDetalheModal({ id, user, onClose, onChanged }) {
  const [t, setT] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [acaoComMotivo, setAcaoComMotivo] = useState(null); // 'recusar' | 'cancelar'
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (!id) return undefined;

    let cancelado = false;
    setT(null);
    setErro('');
    setAcaoComMotivo(null);
    setMotivo('');
    setCarregando(true);

    obterTransferencia(id)
      .then(dados => { if (!cancelado) setT(dados); })
      .catch(err => { if (!cancelado) setErro(err?.message || 'Não foi possível carregar a transferência.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [id]);

  // ESC e clique fora fecham (sem dado de formulário a proteger), exceto durante um envio.
  const { solicitarFechamento } = useConfirmarFechamentoModal({
    open: Boolean(id),
    isDirty: false,
    onClose: () => { if (!enviando) onClose(); },
  });

  if (!id) return null;

  const acoes = acoesPermitidas(t, user);

  async function executar(fn) {
    if (enviando) return;
    setEnviando(true);
    setErro('');
    try {
      const atualizada = await fn();
      setT(atualizada);
      setAcaoComMotivo(null);
      setMotivo('');
      onChanged?.(atualizada);
    } catch (err) {
      setErro(err?.message || 'Não foi possível concluir a ação.');
    } finally {
      setEnviando(false);
    }
  }

  function confirmarMotivo(e) {
    e.preventDefault();
    const v = validarMotivo(motivo);
    if (!v.valido) {
      setErro(v.erro);
      return;
    }
    const fn = acaoComMotivo === 'recusar' ? recusarTransferencia : cancelarTransferencia;
    executar(() => fn(id, v.motivo));
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && solicitarFechamento()}>
      <div className="modal-panel card transf-modal" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="transf-detalhe-titulo">
        <div className="modal-header">
          <h2 className="modal-title" id="transf-detalhe-titulo">Transferência #{id}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar" disabled={enviando}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {erro && <div className="modal-error" role="alert">{erro}</div>}
          {carregando && <p className="text-sm text-secondary">Carregando...</p>}

          {t && (
            <>
              <div className="transf-resumo">
                <span className={`badge ${STATUS_BADGE[t.status] ?? ''}`}>{STATUS_ROTULO[t.status] ?? t.status}</span>
                <span><strong>{t.origem_nome}</strong> → <strong>{t.destino_nome}</strong></span>
              </div>

              <table className="estoque-table transf-tabela">
                <thead><tr><th>Produto</th><th>SKU</th><th>Qtd.</th></tr></thead>
                <tbody>
                  {t.itens.map(i => (
                    <tr key={i.produto_id}>
                      <td>{i.produto_nome}</td>
                      <td>{i.produto_sku || '—'}</td>
                      <td><strong>{i.quantidade}</strong></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr><td colSpan={2}>Total</td><td><strong>{totalDeUnidades(t.itens)}</strong></td></tr></tfoot>
              </table>

              {t.observacao && <p className="text-sm"><strong>Observação:</strong> {t.observacao}</p>}
              {t.motivo_resolucao && <p className="text-sm"><strong>Motivo:</strong> {t.motivo_resolucao}</p>}

              <h3 className="modal-form-section-title">Histórico</h3>
              <ul className="transf-historico">
                {t.eventos.map(ev => (
                  <li key={ev.id}>
                    <strong>{ROTULO_ACAO[ev.acao] ?? ev.acao}</strong> por {ev.executado_por_nome} em {formatarDataHora(ev.criado_em)}
                    {ev.motivo ? ` — ${ev.motivo}` : ''}
                  </li>
                ))}
              </ul>

              {acaoComMotivo && (
                <form onSubmit={confirmarMotivo} noValidate className="transf-motivo">
                  <label className="input-label" htmlFor="transf-motivo">{TITULO_MOTIVO[acaoComMotivo]} — motivo *</label>
                  <input id="transf-motivo" type="text" className="input-field" maxLength={300} value={motivo} autoFocus
                    disabled={enviando} onChange={e => { setMotivo(e.target.value); setErro(''); }} />
                  <div className="transf-motivo-acoes">
                    <button type="button" className="btn btn-ghost" disabled={enviando} onClick={() => { setAcaoComMotivo(null); setErro(''); }}>Voltar</button>
                    <button type="submit" className="btn btn-primary" disabled={enviando}>
                      {enviando ? 'Enviando...' : 'Confirmar'}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {t && !acaoComMotivo && (acoes.aceitar || acoes.recusar || acoes.cancelar) && (
          <div className="modal-footer">
            {acoes.cancelar && (
              <button type="button" className="btn btn-ghost" disabled={enviando} onClick={() => { setAcaoComMotivo('cancelar'); setErro(''); }}>
                Cancelar transferência
              </button>
            )}
            {acoes.recusar && (
              <button type="button" className="btn btn-secondary" disabled={enviando} onClick={() => { setAcaoComMotivo('recusar'); setErro(''); }}>
                Recusar
              </button>
            )}
            {acoes.aceitar && (
              <button type="button" className="btn btn-primary" disabled={enviando} onClick={() => executar(() => aceitarTransferencia(id))}>
                {enviando ? 'Enviando...' : 'Aceitar'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
