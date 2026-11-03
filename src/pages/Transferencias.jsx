import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Plus, Briefcase, Undo2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listarTransferencias } from '../services/transferenciasEstoque';
import { listarLocais } from '../services/locaisEstoque';
import { FILTROS_DE_STATUS } from '../utils/transferencias';
import TransferenciasTabela from '../components/transferencias/TransferenciasTabela';
import NovaTransferenciaModal from '../components/transferencias/NovaTransferenciaModal';
import TransferenciaDetalheModal from '../components/transferencias/TransferenciaDetalheModal';
import './Estoque.css';

const POR_PAGINA = 20;

// Equipe (admin/estoquista): todas as transferências da empresa. O backend decide o que cada
// pessoa pode ver e fazer; a tela só esconde o que daria 403.
export default function Transferencias() {
  const { user } = useAuth();
  const toast = useToast();

  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [dados, setDados] = useState({ items: [], total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [locais, setLocais] = useState([]);
  const [novaOpen, setNovaOpen] = useState(false);
  const [atalho, setAtalho] = useState(null); // 'montar' | 'devolver' | null (transferência livre)
  const [detalheId, setDetalheId] = useState(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');
    try {
      setDados(await listarTransferencias({ status: status || undefined, page, pageSize: POR_PAGINA }));
    } catch (err) {
      setErro(err?.message || 'Não foi possível carregar as transferências.');
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    listarLocais().then(l => setLocais(Array.isArray(l) ? l : [])).catch(() => setLocais([]));
  }, []);

  function selecionarStatus(key) {
    setStatus(key);
    setPage(1);
  }

  const equipe = user?.role === 'admin' || user?.role === 'estoquista';
  const temMaleta = locais.some(l => l.tipo === 'maleta' && l.ativo !== false);

  function abrir(qual) {
    setAtalho(qual);
    setNovaOpen(true);
  }

  function handleCriada(t) {
    setNovaOpen(false);
    if (t.aviso) toast.warning(`Transferência #${t.id} criada, mas ficou aguardando aceite: ${t.aviso}`);
    else if (t.status === 'concluida') toast.success(`Devolução #${t.id} registrada: as peças já estão no destino.`);
    else if (atalho === 'montar') toast.success(`Maleta: transferência #${t.id} enviada. Entra na maleta quando o vendedor aceitar.`);
    else toast.success(`Transferência #${t.id} criada. Aguardando aceite.`);
    carregar();
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transferências</h1>
          <p className="page-subtitle">Movimentação de estoque entre Central, maletas e consignados</p>
        </div>
        <div className="estoque-header-actions">
          {equipe && (
            <>
              <button className="btn btn-primary" onClick={() => abrir('montar')} disabled={!temMaleta}
                title={temMaleta ? 'Central → maleta do vendedor, bipando as peças' : 'Crie a maleta do vendedor em Estoque → Novo local'}>
                <Briefcase size={16} />
                Montar maleta
              </button>
              <button className="btn btn-secondary" onClick={() => abrir('devolver')} disabled={!temMaleta}
                title={temMaleta ? 'Maleta do vendedor → Central, bipando as peças que voltaram' : 'Crie a maleta do vendedor em Estoque → Novo local'}>
                <Undo2 size={16} />
                Receber devolução
              </button>
            </>
          )}
          <button className="btn btn-ghost" onClick={() => abrir(null)} disabled={locais.length < 2}>
            <Plus size={16} />
            Nova transferência
          </button>
        </div>
      </div>

      <div className="estoque-filters">
        <div className="estoque-filter-pills">
          {FILTROS_DE_STATUS.map(f => (
            <button
              key={f.key || 'todas'}
              className={`category-pill ${status === f.key ? 'category-pill--active' : ''}`}
              onClick={() => selecionarStatus(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <div className="empty-state"><p className="text-sm text-secondary">Carregando transferências...</p></div>}

      {!loading && erro && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar as transferências</div>
          <p className="text-sm text-secondary">{erro}</p>
        </div>
      )}

      {!loading && !erro && (
        <div className="card">
          {dados.items.length > 0 ? (
            <TransferenciasTabela items={dados.items} onAbrir={setDetalheId} />
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon"><ArrowLeftRight size={24} /></div>
              <div className="empty-state-title">Nenhuma transferência encontrada</div>
            </div>
          )}
        </div>
      )}

      {!loading && !erro && dados.totalPages > 1 && (
        <div className="estoque-filters">
          <button className="btn btn-ghost" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Anterior</button>
          <span className="text-sm text-secondary">Página {page} de {dados.totalPages}</span>
          <button className="btn btn-ghost" disabled={page >= dados.totalPages} onClick={() => setPage(p => p + 1)}>Próxima</button>
        </div>
      )}

      {equipe && !temMaleta && locais.length > 0 && (
        <p className="text-sm text-secondary">Para montar maletas, crie primeiro a maleta de cada vendedor em Estoque → Novo local.</p>
      )}

      <NovaTransferenciaModal open={novaOpen} locais={locais} user={user} atalho={atalho} onClose={() => setNovaOpen(false)} onSaved={handleCriada} />

      <TransferenciaDetalheModal
        id={detalheId}
        user={user}
        onClose={() => setDetalheId(null)}
        onChanged={() => { toast.success('Transferência atualizada.'); carregar(); }}
      />
    </div>
  );
}
