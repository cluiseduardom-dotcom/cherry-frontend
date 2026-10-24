import { useEffect, useState } from 'react';
import { X, ArrowUpRight, ArrowDownRight, Ban, CheckCircle2, AlertCircle, History } from 'lucide-react';
import { obterHistoricoComissao } from '../../services/comissoes';
import { formatarMoeda } from '../../utils/mascaras';
import {
  formatarDataHora,
  formatarPercentual,
  formatarDescricaoEvento,
  getComissaoStatusMeta,
} from '../../utils/formatarComissao';

export default function HistoricoComissaoModal({ comissaoId, open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dados, setDados] = useState(null);

  useEffect(() => {
    if (!open || !comissaoId) {
      setDados(null);
      setError('');
      return;
    }

    let cancelado = false;
    setLoading(true);
    setError('');

    obterHistoricoComissao(comissaoId)
      .then(res => {
        if (!cancelado) setDados(res);
      })
      .catch(err => {
        if (!cancelado) setError(err.message || 'Erro ao carregar histórico da comissão.');
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [open, comissaoId]);

  if (!open) return null;

  const comissao = dados?.comissao;
  const eventos = dados?.eventos || [];
  const statusMeta = comissao ? getComissaoStatusMeta(comissao.status) : null;
  const StatusIcon = statusMeta?.icon;

  function getEventIcon(tipo) {
    if (tipo === 'liberacao') return <ArrowUpRight size={16} className="text-success" />;
    if (tipo === 'reducao') return <ArrowDownRight size={16} className="text-warning" />;
    if (tipo === 'estorno') return <Ban size={16} className="text-danger" />;
    return <CheckCircle2 size={16} className="text-info" />;
  }

  return (
    <div className="confirm-dialog-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="confirm-dialog comissoes-modal" role="dialog" aria-modal="true">
        <div className="comissoes-modal-header">
          <div className="comissoes-modal-title-row">
            <History size={20} className="text-primary" />
            <h2 className="comissoes-modal-title">
              Histórico da Comissão #{comissaoId}
            </h2>
          </div>
          <button
            type="button"
            className="btn btn-ghost comissoes-modal-close"
            onClick={onClose}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className="comissoes-modal-body">
          {loading && (
            <div className="comissoes-loading-box">
              <span className="spinner" />
              <span>Carregando histórico...</span>
            </div>
          )}

          {error && (
            <div className="comissoes-error-banner" role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && comissao && (
            <>
              {/* Resumo da comissão */}
              <div className="comissoes-historico-resumo card card-padding">
                <div className="comissoes-resumo-grid">
                  <div>
                    <span className="comissoes-resumo-label">Venda</span>
                    <span className="comissoes-resumo-value">#{comissao.venda_id}</span>
                  </div>
                  <div>
                    <span className="comissoes-resumo-label">Base de Cálculo</span>
                    <span className="comissoes-resumo-value">{formatarMoeda(comissao.base_calculo)}</span>
                  </div>
                  <div>
                    <span className="comissoes-resumo-label">Percentual</span>
                    <span className="comissoes-resumo-value">{formatarPercentual(comissao.percentual)}</span>
                  </div>
                  <div>
                    <span className="comissoes-resumo-label">Comissão Total</span>
                    <span className="comissoes-resumo-value">{formatarMoeda(comissao.valor)}</span>
                  </div>
                  <div>
                    <span className="comissoes-resumo-label">Valor Liberado</span>
                    <span className="comissoes-resumo-value text-success font-semibold">
                      {formatarMoeda(comissao.valor_liberado)}
                    </span>
                  </div>
                  <div>
                    <span className="comissoes-resumo-label">Status Atual</span>
                    <span className={`badge ${statusMeta.badgeClass} comissoes-badge-with-icon`}>
                      {StatusIcon && <StatusIcon size={12} />}
                      {statusMeta.label}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linha do tempo dos eventos */}
              <div className="comissoes-timeline-container">
                <h3 className="comissoes-timeline-title">Linha do Tempo dos Movimentos</h3>
                {eventos.length === 0 ? (
                  <p className="text-sm text-secondary">Nenhum evento registrado.</p>
                ) : (
                  <div className="comissoes-timeline">
                    {eventos.map(ev => {
                      const deltaNum = Number(ev.delta || 0);
                      const isPositive = deltaNum > 0;
                      const isNegative = deltaNum < 0;

                      return (
                        <div key={ev.id} className="comissoes-timeline-item">
                          <div className="comissoes-timeline-marker">
                            {getEventIcon(ev.tipo)}
                          </div>
                          <div className="comissoes-timeline-content">
                            <div className="comissoes-timeline-header-line">
                              <span className="comissoes-timeline-event-name">
                                {formatarDescricaoEvento(ev.tipo, ev.origem)}
                              </span>
                              <span className="comissoes-timeline-time">
                                {formatarDataHora(ev.criado_em)}
                              </span>
                            </div>

                            <div className="comissoes-timeline-details">
                              <span className="comissoes-timeline-delta">
                                Variação:{' '}
                                <strong
                                  className={
                                    isPositive
                                      ? 'text-success'
                                      : isNegative
                                      ? 'text-danger'
                                      : 'text-secondary'
                                  }
                                >
                                  {isPositive ? `+ ${formatarMoeda(deltaNum)}` : formatarMoeda(deltaNum)}
                                </strong>
                              </span>
                              <span className="comissoes-timeline-acumulado">
                                Liberado acumulado: <strong>{formatarMoeda(ev.valor_liberado_apos)}</strong>
                              </span>
                            </div>

                            <div className="comissoes-timeline-footer">
                              <span>
                                {ev.executado_por_nome
                                  ? `Registrado por: ${ev.executado_por_nome}`
                                  : 'Registrado pelo sistema'}
                              </span>
                              {ev.repasse_id && (
                                <span className="badge badge-info">
                                  Repasse #{ev.repasse_id}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="comissoes-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
