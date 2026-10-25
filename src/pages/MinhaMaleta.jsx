import { useCallback, useEffect, useState } from 'react';
import { Package, MapPin, Undo2, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listarLocais, saldosDoLocal } from '../services/locaisEstoque';
import { listarTransferencias } from '../services/transferenciasEstoque';
import { filtrarSaldos, totalDeUnidades } from '../utils/locaisEstoque';
import TransferenciasTabela from '../components/transferencias/TransferenciasTabela';
import NovaTransferenciaModal from '../components/transferencias/NovaTransferenciaModal';
import TransferenciaDetalheModal from '../components/transferencias/TransferenciaDetalheModal';
import './Estoque.css';

// Visão do vendedor: o que ele tem na própria maleta, o que está esperando o aceite dele
// e a devolução ao Central. Só enxerga a própria maleta (o backend garante).
export default function MinhaMaleta() {
  const { user } = useAuth();
  const toast = useToast();

  const [locais, setLocais] = useState([]);
  const [saldos, setSaldos] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [search, setSearch] = useState('');
  const [devolverOpen, setDevolverOpen] = useState(false);
  const [detalheId, setDetalheId] = useState(null);

  const maleta = locais.find(l => l.tipo === 'maleta') ?? null;

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      const lista = await listarLocais();
      const todos = Array.isArray(lista) ? lista : [];
      setLocais(todos);

      const minha = todos.find(l => l.tipo === 'maleta');
      if (!minha) {
        setSaldos([]);
        setTransferencias([]);
        return;
      }

      const [saldosDados, transfDados] = await Promise.all([
        saldosDoLocal(minha.id),
        listarTransferencias({ pageSize: 50 }),
      ]);
      setSaldos(saldosDados.items);
      setTransferencias(transfDados.items);
    } catch (err) {
      setErro(err?.message || 'Não foi possível carregar a sua maleta.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const pendentes = transferencias.filter(t => t.status === 'pendente');
  const recentes = transferencias.filter(t => t.status !== 'pendente').slice(0, 10);
  const saldosFiltrados = filtrarSaldos(saldos, search);

  function aposMudanca(mensagem) {
    toast.success(mensagem);
    carregar();
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Minha maleta</h1>
          <p className="page-subtitle">{maleta ? maleta.nome : 'Estoque que fica com você'}</p>
        </div>
        {maleta && (
          <div className="estoque-header-actions">
            <button className="btn btn-primary" onClick={() => setDevolverOpen(true)} disabled={saldos.length === 0}>
              <Undo2 size={16} />
              Devolver ao Central
            </button>
          </div>
        )}
      </div>

      {loading && <div className="empty-state"><p className="text-sm text-secondary">Carregando...</p></div>}

      {!loading && erro && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar a sua maleta</div>
          <p className="text-sm text-secondary">{erro}</p>
        </div>
      )}

      {!loading && !erro && !maleta && (
        <div className="empty-state">
          <div className="empty-state-icon"><MapPin size={24} /></div>
          <div className="empty-state-title">Você ainda não tem uma maleta</div>
          <p className="text-sm text-secondary">Peça ao administrador para criar uma para você. Enquanto isso, suas vendas saem do estoque Central.</p>
        </div>
      )}

      {!loading && !erro && maleta && (
        <>
          <div className="estoque-summary">
            <div className="estoque-summary-card card card-padding">
              <div className="estoque-summary-icon" style={{ background: 'var(--color-primary-ultra)', color: 'var(--color-primary)' }}><MapPin size={20} /></div>
              <div>
                <div className="estoque-summary-value">{totalDeUnidades(saldos)}</div>
                <div className="estoque-summary-label">Itens na maleta</div>
              </div>
            </div>
            <div className="estoque-summary-card card card-padding">
              <div className="estoque-summary-icon" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning)' }}><Package size={20} /></div>
              <div>
                <div className="estoque-summary-value">{pendentes.length}</div>
                <div className="estoque-summary-label">Aguardando aceite</div>
              </div>
            </div>
          </div>

          {pendentes.length > 0 && (
            <>
              <h2 className="page-subtitle transf-secao">Transferências aguardando aceite</h2>
              <div className="card"><TransferenciasTabela items={pendentes} onAbrir={setDetalheId} /></div>
            </>
          )}

          <h2 className="page-subtitle transf-secao">Produtos na maleta</h2>
          <div className="estoque-filters">
            <div className="input-icon-wrapper" style={{ flex: 1, maxWidth: 360 }}>
              <Search size={16} className="input-icon" />
              <input type="text" className="input-field" placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="card">
            {saldosFiltrados.length > 0 ? (
              <table className="estoque-table">
                <thead><tr><th>Produto</th><th>SKU</th><th>Quantidade</th></tr></thead>
                <tbody>
                  {saldosFiltrados.map(i => (
                    <tr key={i.produto_id} className="estoque-row">
                      <td><span className="estoque-product-name">{i.nome}</span></td>
                      <td><span className="estoque-sku">{i.sku || '—'}</span></td>
                      <td><strong>{i.saldo}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon"><Package size={24} /></div>
                <div className="empty-state-title">{saldos.length === 0 ? 'Sua maleta está vazia' : 'Nenhum produto encontrado'}</div>
              </div>
            )}
          </div>

          {recentes.length > 0 && (
            <>
              <h2 className="page-subtitle transf-secao">Últimas transferências</h2>
              <div className="card"><TransferenciasTabela items={recentes} onAbrir={setDetalheId} /></div>
            </>
          )}
        </>
      )}

      <NovaTransferenciaModal
        open={devolverOpen}
        locais={locais}
        user={user}
        onClose={() => setDevolverOpen(false)}
        onSaved={t => { setDevolverOpen(false); aposMudanca(`Devolução #${t.id} criada. Aguardando a equipe aceitar.`); }}
      />

      <TransferenciaDetalheModal
        id={detalheId}
        user={user}
        onClose={() => setDetalheId(null)}
        onChanged={() => aposMudanca('Transferência atualizada.')}
      />
    </div>
  );
}
