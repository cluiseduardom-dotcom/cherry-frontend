import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { sugestoesDoMovimento } from '../../services/bancos';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarData } from '../../utils/formatarData';
import '../ProductModal.css';

export default function SugestoesModal({ open, movimento, onClose }) {
  const [itens, setItens] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!open || !movimento) return undefined;
    let cancelado = false;
    setItens(null); setErro('');
    sugestoesDoMovimento(movimento.id)
      .then(r => { if (!cancelado) setItens(r); })
      .catch(err => { if (!cancelado) setErro(err.message); });
    return () => { cancelado = true; };
  }, [open, movimento]);

  if (!open || !movimento) return null;
  const saida = movimento.tipo === 'SAIDA';

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{saida ? 'Contas a pagar parecidas' : 'Contas a receber parecidas'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p className="text-sm">{movimento.descricao} — <strong>{formatarMoeda(movimento.valor)}</strong></p>
          {erro && <div className="modal-error">{erro}</div>}
          {!erro && itens === null && <p className="text-sm text-secondary">Buscando...</p>}
          {itens?.length === 0 && (
            <p className="text-sm text-secondary">
              Nenhum título em aberto com exatamente este valor e vencimento até 15 dias deste movimento.
            </p>
          )}
          {itens?.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 8 }}>
              {itens.map(t => (
                <li key={`${t.tipo_titulo}-${t.id}`} className="card card-padding">
                  <strong>{t.descricao}</strong>{t.fornecedor ? ` — ${t.fornecedor}` : ''}
                  <div className="text-sm text-secondary">
                    {formatarMoeda(t.valor)} · vence {formatarData(t.data_vencimento)}
                    {t.dias_de_diferenca !== 0 && ` (${Math.abs(t.dias_de_diferenca)} dia(s) ${t.dias_de_diferenca > 0 ? 'depois' : 'antes'})`}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-secondary">
            É só uma sugestão. Para dar baixa, abra <Link to={saida ? '/contas-pagar' : '/contas-receber'} onClick={onClose}>{saida ? 'Contas a Pagar' : 'Contas a Receber'}</Link> e marque o título.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  );
}
