import { useCallback, useEffect, useState } from 'react';
import { ClipboardCheck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { acertoDoLocal, listarConferencias } from '../../services/conferenciasEstoque';
import { COLUNAS_ACERTO, contaFecha, dataValida, rotuloDaDiferenca } from '../../utils/conferencias';
import { formatarDataHora } from '../../utils/formatarData';
import { formatarMoeda } from '../../utils/mascaras';
import NovaConferenciaModal from './NovaConferenciaModal';
import '../../pages/Estoque.css';
import './Conferencias.css';

// Acerto (o que entrou, saiu e foi vendido) + histórico de conferências de UM local.
// `podeConferir` = equipe (registra contagem); `admin` = pode aplicar o ajuste. O vendedor usa só
// a leitura na própria maleta. O backend decide o que cada papel vê e faz.
export default function AcertoDoLocal({ local, podeConferir = false, admin = false }) {
  const toast = useToast();

  const [desde, setDesde] = useState('');
  const [acerto, setAcerto] = useState(null);
  const [conferencias, setConferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const localId = local?.id;
  const periodoInvalido = desde !== '' && !dataValida(desde);

  const carregar = useCallback(async () => {
    if (!localId || periodoInvalido) return;

    setLoading(true);
    setErro('');
    try {
      const [dadosAcerto, dadosConf] = await Promise.all([
        acertoDoLocal(localId, { desde: desde || undefined }),
        listarConferencias(localId, { pageSize: 20 }),
      ]);
      setAcerto(dadosAcerto);
      setConferencias(dadosConf.items);
    } catch (err) {
      setAcerto(null);
      setConferencias([]);
      setErro(err?.message || 'Não foi possível carregar o acerto.');
    } finally {
      setLoading(false);
    }
  }, [localId, desde, periodoInvalido]);

  useEffect(() => { carregar(); }, [carregar]);

  function aposConferencia(criada, ajustou) {
    setModalOpen(false);
    toast.success(ajustou ? `Conferência #${criada.id} registrada e estoque ajustado.` : `Conferência #${criada.id} registrada.`);
    carregar();
  }

  return (
    <section>
      <div className="acerto-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="acerto-desde">Acertar desde (opcional)</label>
          <input id="acerto-desde" type="date" className="input-field" value={desde} onChange={e => setDesde(e.target.value)} />
        </div>
        {podeConferir && (
          <button type="button" className="btn btn-primary" onClick={() => setModalOpen(true)}>
            <ClipboardCheck size={16} /> Registrar conferência
          </button>
        )}
      </div>

      {periodoInvalido && <div className="modal-error" role="alert">Data inválida.</div>}
      {loading && <p className="text-sm text-secondary">Carregando acerto...</p>}
      {!loading && erro && <div className="modal-error" role="alert">{erro}</div>}

      {!loading && !erro && acerto && (
        <>
          <div className="card acerto-scroll">
            {acerto.itens.length === 0 ? (
              <div className="empty-state"><p className="text-sm text-secondary">Nenhuma movimentação neste local{desde ? ' no período' : ''}.</p></div>
            ) : (
              <table className="estoque-table">
                <thead>
                  <tr>
                    <th>Produto</th>
                    {COLUNAS_ACERTO.map(c => <th key={c.campo} className="acerto-num">{c.rotulo}</th>)}
                    <th className="acerto-num">Valor vendido</th>
                    <th>Conta</th>
                  </tr>
                </thead>
                <tbody>
                  {acerto.itens.map(i => (
                    <tr key={i.produto_id} className="estoque-row">
                      <td>{i.nome}{i.sku ? ` (${i.sku})` : ''}</td>
                      {COLUNAS_ACERTO.map(c => <td key={c.campo} className="acerto-num">{i[c.campo]}</td>)}
                      <td className="acerto-num">{formatarMoeda(i.valor_vendido)}</td>
                      <td className={i.confere && contaFecha(i) ? '' : 'acerto-nao-confere'}>{i.confere && contaFecha(i) ? 'Confere' : 'Não confere'}</td>
                    </tr>
                  ))}
                  <tr className="estoque-row acerto-total">
                    <td>Total</td>
                    {COLUNAS_ACERTO.map(c => <td key={c.campo} className="acerto-num">{acerto.totais[c.campo]}</td>)}
                    <td className="acerto-num">{formatarMoeda(acerto.totais.valor_vendido)}</td>
                    <td className={acerto.confere ? '' : 'acerto-nao-confere'}>{acerto.confere ? 'Confere' : 'Não confere'}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>
          <p className="acerto-nota">
            Saldo inicial + recebido − enviado − vendido + ajustes + outros = saldo atual. Calculado do histórico de movimentações.
            Mercadoria pendente em trânsito só aparece depois do aceite (ou da devolução).
          </p>

          <h2 className="page-subtitle transf-secao">Conferências registradas</h2>
          {conferencias.length === 0 ? (
            <p className="text-sm text-secondary">Nenhuma conferência registrada neste local.</p>
          ) : (
            <div className="conf-hist">
              {conferencias.map(c => (
                <details key={c.id}>
                  <summary>
                    <strong>#{c.id}</strong>
                    <span>{formatarDataHora(c.criado_em)}</span>
                    <span>por {c.criado_por_nome}</span>
                    <span className={`badge ${c.ajuste_aplicado ? 'badge-warning' : ''}`}>{c.ajuste_aplicado ? 'Estoque ajustado' : 'Só registro'}</span>
                  </summary>
                  {c.observacao && <p className="text-sm">Observação: {c.observacao}</p>}
                  <table className="estoque-table">
                    <thead><tr><th>Produto</th><th className="acerto-num">Sistema</th><th className="acerto-num">Contado</th><th className="acerto-num">Diferença</th></tr></thead>
                    <tbody>
                      {c.itens.map(i => (
                        <tr key={i.produto_id} className="estoque-row">
                          <td>{i.nome}</td>
                          <td className="acerto-num">{i.saldo_sistema}</td>
                          <td className="acerto-num">{i.quantidade_contada}</td>
                          <td className={`acerto-num ${i.diferenca > 0 ? 'conf-sobra' : i.diferenca < 0 ? 'conf-falta' : ''}`}>{rotuloDaDiferenca(i.diferenca)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              ))}
            </div>
          )}
        </>
      )}

      {podeConferir && (
        <NovaConferenciaModal open={modalOpen} local={local} admin={admin} onClose={() => setModalOpen(false)} onSaved={aposConferencia} />
      )}
    </section>
  );
}
