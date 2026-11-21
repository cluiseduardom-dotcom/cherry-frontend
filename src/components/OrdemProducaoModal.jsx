import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import {
  cancelarOrdem, concluirOrdem, iniciarOrdem, regularizarInsumos,
} from '../services/producao';
import {
  STATUS_ORDEM, acoesDaOrdem, formatarPrazo, montarConclusao, resumirPendencias, rotuloStatus,
  temCustoNaOrdem, validarConclusao, validarMotivo,
} from '../utils/producao';
import { formatarQuantidade } from '../utils/unidades';
import './ProductModal.css';

const moeda = valor => Number(valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// Detalhe da ordem + as ações do estado atual. O backend valida de novo (409 se o estado mudou).
export default function OrdemProducaoModal({ ordem, onClose, onChanged }) {
  const [painel, setPainel] = useState(null); // 'concluir' | 'cancelar' | null
  const [conclusao, setConclusao] = useState({ quantidade_produzida: String(ordem?.quantidade_planejada ?? ''), quantidade_perdida: '' });
  const [motivo, setMotivo] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  if (!ordem) return null;

  const acoes = acoesDaOrdem(ordem);
  const pendencias = resumirPendencias(ordem);
  const comCusto = temCustoNaOrdem(ordem);
  const status = STATUS_ORDEM[ordem.status];

  async function executar(chamada) {
    setError('');
    setWorking(true);
    try {
      const atualizada = await chamada();
      setPainel(null);
      onChanged?.(atualizada);
    } catch (err) {
      setError(err.message);
    } finally {
      setWorking(false);
    }
  }

  function enviarConclusao(evento) {
    evento.preventDefault();
    const erro = validarConclusao(conclusao);
    if (erro) { setError(erro); return; }
    executar(() => concluirOrdem(ordem.id, montarConclusao(conclusao)));
  }

  function enviarCancelamento(evento) {
    evento.preventDefault();
    const erro = validarMotivo(motivo);
    if (erro) { setError(erro); return; }
    executar(() => cancelarOrdem(ordem.id, motivo.trim()));
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !working && onClose()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Ordem #{ordem.id}: {ordem.produto_nome}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar" disabled={working}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {error && <div className="modal-error">{error}</div>}

          <p>
            <span className={`badge ${status?.badge ?? ''}`}>{rotuloStatus(ordem.status)}</span>
            {pendencias.tem && <span className="badge badge-warning producao-badge-pendencia">Insumo pendente</span>}
          </p>

          <dl className="producao-dados">
            <div><dt>Planejado</dt><dd>{ordem.quantidade_planejada}</dd></div>
            {ordem.status === 'concluida' && (
              <>
                <div><dt>Produzido</dt><dd>{ordem.quantidade_produzida}</dd></div>
                <div><dt>Perdido</dt><dd>{ordem.quantidade_perdida}{ordem.perda_pct !== null && ordem.perda_pct !== undefined ? ` (${String(ordem.perda_pct).replace('.', ',')}%)` : ''}</dd></div>
              </>
            )}
            <div><dt>Prazo</dt><dd>{formatarPrazo(ordem.prazo)}</dd></div>
            {comCusto && ordem.custo_insumos !== null && <div><dt>Custo dos insumos</dt><dd>{moeda(ordem.custo_insumos)}</dd></div>}
            {comCusto && ordem.custo_unitario_real !== null && ordem.custo_unitario_real !== undefined && <div><dt>Custo real por unidade</dt><dd>{moeda(ordem.custo_unitario_real)}</dd></div>}
          </dl>
          {ordem.observacao && <p className="text-sm">{ordem.observacao}</p>}
          {ordem.status === 'cancelada' && ordem.motivo_cancelamento && <p className="text-sm">Motivo do cancelamento: {ordem.motivo_cancelamento}</p>}

          {pendencias.tem && (
            <div className="producao-aviso producao-aviso--aviso">
              <AlertTriangle size={16} aria-hidden="true" />
              <div>
                <strong>Faltou insumo no sistema ao concluir.</strong>
                <p className="text-sm">A produção foi registrada. Quando a entrada do insumo for lançada, use "Regularizar insumos" para dar a baixa.</p>
                <ul className="producao-insumos">
                  {pendencias.pendencias.map(p => (
                    <li key={p.insumo_produto_id}>{p.nome}: faltam baixar {formatarQuantidade(p.quantidade_pendente, p.unidade)} de {formatarQuantidade(p.quantidade_prevista, p.unidade)}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {ordem.insumos?.length > 0 && ordem.status !== 'concluida' && ordem.status !== 'cancelada' && (
            <>
              <h3 className="section-title">Insumos para {ordem.quantidade_planejada} un.</h3>
              <ul className="producao-insumos">
                {ordem.insumos.map(i => {
                  const falta = i.disponivel < i.necessario_planejado;
                  return (
                    <li key={i.insumo_produto_id} className={falta ? 'producao-insumos--falta' : ''}>
                      {i.nome}: precisa de {formatarQuantidade(i.necessario_planejado, i.unidade)}, há {formatarQuantidade(i.disponivel, i.unidade)}{falta ? ` (faltam ${formatarQuantidade(i.necessario_planejado - i.disponivel, i.unidade)})` : ''}
                    </li>
                  );
                })}
              </ul>
              {ordem.insumos.some(i => i.disponivel < i.necessario_planejado) && (
                <p className="text-sm text-secondary">Faltar insumo no sistema não impede de produzir: a baixa fica pendente até a entrada ser lançada.</p>
              )}
            </>
          )}

          {painel === 'concluir' && (
            <form onSubmit={enviarConclusao} noValidate className="producao-form-inline">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="oc-produzida">Quantidade produzida *</label>
                <input id="oc-produzida" type="number" min="0" step="1" className="input-field" value={conclusao.quantidade_produzida} onChange={e => setConclusao(c => ({ ...c, quantidade_produzida: e.target.value }))} />
              </div>
              <div className="input-wrapper">
                <label className="input-label" htmlFor="oc-perdida">Quantidade perdida</label>
                <input id="oc-perdida" type="number" min="0" step="1" className="input-field" value={conclusao.quantidade_perdida} onChange={e => setConclusao(c => ({ ...c, quantidade_perdida: e.target.value }))} placeholder="0" />
              </div>
              <p className="text-sm text-secondary">Os insumos são baixados pelo total feito (produzido + perdido). Só o produzido entra no estoque do produto.</p>
              <div className="producao-form-botoes">
                <button type="button" className="btn btn-secondary" onClick={() => setPainel(null)} disabled={working}>Voltar</button>
                <button type="submit" className="btn btn-primary" disabled={working}>{working ? 'Concluindo…' : 'Concluir ordem'}</button>
              </div>
            </form>
          )}

          {painel === 'cancelar' && (
            <form onSubmit={enviarCancelamento} noValidate className="producao-form-inline">
              <div className="input-wrapper">
                <label className="input-label" htmlFor="oc-motivo">Motivo do cancelamento *</label>
                <input id="oc-motivo" type="text" maxLength={200} className="input-field" value={motivo} onChange={e => setMotivo(e.target.value)} />
              </div>
              <div className="producao-form-botoes">
                <button type="button" className="btn btn-secondary" onClick={() => setPainel(null)} disabled={working}>Voltar</button>
                <button type="submit" className="btn btn-danger" disabled={working}>{working ? 'Cancelando…' : 'Cancelar ordem'}</button>
              </div>
            </form>
          )}
        </div>

        {!painel && acoes.length > 0 && (
          <div className="modal-footer">
            {acoes.includes('cancelar') && <button type="button" className="btn btn-secondary" onClick={() => { setError(''); setPainel('cancelar'); }} disabled={working}>Cancelar ordem</button>}
            {acoes.includes('iniciar') && <button type="button" className="btn btn-primary" onClick={() => executar(() => iniciarOrdem(ordem.id))} disabled={working}>{working ? 'Iniciando…' : 'Iniciar produção'}</button>}
            {acoes.includes('concluir') && <button type="button" className="btn btn-primary" onClick={() => { setError(''); setPainel('concluir'); }} disabled={working}>Concluir…</button>}
            {acoes.includes('regularizar') && <button type="button" className="btn btn-primary" onClick={() => executar(() => regularizarInsumos(ordem.id))} disabled={working}>{working ? 'Regularizando…' : 'Regularizar insumos'}</button>}
          </div>
        )}
      </div>
    </div>
  );
}
