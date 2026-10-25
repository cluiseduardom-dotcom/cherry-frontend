import { STATUS_ROTULO, STATUS_BADGE } from '../../utils/transferencias';
import { formatarDataHora } from '../../utils/formatarData';
import '../../pages/Estoque.css';

export default function TransferenciasTabela({ items, onAbrir }) {
  return (
    <table className="estoque-table">
      <thead>
        <tr><th>#</th><th>Origem → Destino</th><th>Status</th><th>Criada por</th><th>Data</th></tr>
      </thead>
      <tbody>
        {items.map(t => (
          <tr key={t.id} className="estoque-row transf-linha" onClick={() => onAbrir(t.id)}>
            <td>
              <button type="button" className="btn btn-ghost transf-abrir" onClick={e => { e.stopPropagation(); onAbrir(t.id); }}>
                #{t.id}
              </button>
            </td>
            <td>{t.origem_nome} → {t.destino_nome}</td>
            <td><span className={`badge ${STATUS_BADGE[t.status] ?? ''}`}>{STATUS_ROTULO[t.status] ?? t.status}</span></td>
            <td>{t.criado_por_nome}</td>
            <td>{formatarDataHora(t.criado_em)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
