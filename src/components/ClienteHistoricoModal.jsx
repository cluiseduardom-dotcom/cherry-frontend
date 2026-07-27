import { useEffect, useState } from 'react';
import { X, Search } from 'lucide-react';
import { buscarHistoricoCliente } from '../services/clientes';
import { ApiError } from '../services/api';
import './ProductModal.css';
import '../pages/Historico.css';

export default function ClienteHistoricoModal({ open, cliente, onClose }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !cliente) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      setRegistros([]);
      try {
        const dados = await buscarHistoricoCliente(cliente.id);
        if (!cancelled) setRegistros(dados);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setRegistros([]);
        } else {
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [open, cliente]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open || !cliente) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel card" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Histórico de {cliente.nome}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: 0 }}>
          {loading && (
            <div className="empty-state">
              <p className="text-sm text-secondary">Carregando histórico...</p>
            </div>
          )}

          {!loading && error && (
            <div className="empty-state">
              <div className="empty-state-title">Não foi possível carregar o histórico</div>
              <p className="text-sm text-secondary">{error}</p>
            </div>
          )}

          {!loading && !error && registros.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon"><Search size={24} /></div>
              <div className="empty-state-title">Nenhuma compra registrada</div>
              <p className="text-sm text-secondary">Este cliente ainda não tem vendas.</p>
            </div>
          )}

          {!loading && !error && registros.length > 0 && (
            <table className="historico-table">
              <thead>
                <tr>
                  <th>Venda</th>
                  <th>Data</th>
                  <th>Produto</th>
                  <th>Qtd</th>
                  <th>Preço unit.</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => (
                  <tr key={`${r.venda_id}-${i}`} className="historico-row">
                    <td><span className="historico-id">#{r.venda_id}</span></td>
                    <td className="historico-date">{new Date(r.data).toLocaleDateString('pt-BR')}</td>
                    <td>{r.produto}</td>
                    <td>{r.quantidade}</td>
                    <td>{Number(r.preco_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td className="historico-total">
                      {Number(r.total_item).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
