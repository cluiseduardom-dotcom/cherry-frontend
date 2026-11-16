import { X } from 'lucide-react';
import { formatarMoeda, formatarPct } from '../utils/resultadoVendas';
import './ProductModal.css';
import './ResultadoVenda.css';

// Quanto a venda rendeu: receita, custo, lucro bruto, comissão, imposto e lucro líquido, com a % sobre a receita.
export default function ResultadoVendaModal({ venda, onClose }) {
  const r = venda?.resultado;

  if (!r) return null;

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-panel card" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Resultado da venda #{venda.id}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <dl className="resultado-linhas">
            <div className="resultado-linha">
              <dt>Receita</dt>
              <dd>{formatarMoeda(r.receita)}</dd>
            </div>
            <div className="resultado-linha resultado-linha--menos">
              <dt>Custo dos produtos</dt>
              <dd>− {formatarMoeda(r.custo)}</dd>
            </div>
            <div className="resultado-linha resultado-linha--destaque">
              <dt>Lucro bruto</dt>
              <dd>{formatarMoeda(r.lucro_bruto)} <span className="resultado-pct">{formatarPct(r.margem_bruta_pct)}</span></dd>
            </div>
            <div className="resultado-linha resultado-linha--menos">
              <dt>Comissão do vendedor</dt>
              <dd>− {formatarMoeda(r.comissao)}</dd>
            </div>
            <div className="resultado-linha resultado-linha--menos">
              <dt>Impostos</dt>
              <dd>− {formatarMoeda(r.impostos)}</dd>
            </div>
            <div className="resultado-linha resultado-linha--destaque">
              <dt>Lucro líquido</dt>
              <dd>{formatarMoeda(r.lucro_liquido)} <span className="resultado-pct">{formatarPct(r.margem_liquida_pct)}</span></dd>
            </div>
          </dl>
          <p className="resultado-nota">
            % sobre a receita. Juros de crediário não entram na receita. Despesas fixas não são atribuídas a uma venda;
            elas aparecem no resultado do período.
          </p>
        </div>
      </div>
    </div>
  );
}
