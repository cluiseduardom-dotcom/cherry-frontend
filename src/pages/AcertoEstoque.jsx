import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listarLocais } from '../services/locaisEstoque';
import { rotuloDoLocal } from '../utils/locaisEstoque';
import AcertoDoLocal from '../components/conferencias/AcertoDoLocal';
import './Estoque.css';

// Equipe (admin/estoquista): acerto e conferência de qualquer local. Só admin aplica ajuste.
export default function AcertoEstoque() {
  const { user } = useAuth();
  const [locais, setLocais] = useState([]);
  const [localId, setLocalId] = useState('');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let cancelado = false;
    listarLocais()
      .then(lista => {
        if (cancelado) return;
        const ativos = (Array.isArray(lista) ? lista : []).filter(l => l.ativo !== false);
        setLocais(ativos);
        const padrao = ativos.find(l => l.tipo === 'maleta') ?? ativos[0];
        if (padrao) setLocalId(String(padrao.id));
      })
      .catch(err => { if (!cancelado) setErro(err?.message || 'Não foi possível carregar os locais.'); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, []);

  const local = locais.find(l => String(l.id) === localId) ?? null;

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Acerto de estoque</h1>
          <p className="page-subtitle">O que entrou, saiu e foi vendido em cada local, e a conferência da contagem física</p>
        </div>
        {locais.length > 0 && (
          <div className="input-wrapper">
            <label className="input-label" htmlFor="acerto-local">Local</label>
            <select id="acerto-local" className="input-field" value={localId} onChange={e => setLocalId(e.target.value)}>
              {locais.map(l => <option key={l.id} value={l.id}>{rotuloDoLocal(l)}</option>)}
            </select>
          </div>
        )}
      </div>

      {loading && <div className="empty-state"><p className="text-sm text-secondary">Carregando...</p></div>}
      {!loading && erro && <div className="empty-state"><div className="empty-state-title">{erro}</div></div>}
      {!loading && !erro && !local && <div className="empty-state"><div className="empty-state-title">Nenhum local disponível</div></div>}

      {local && <AcertoDoLocal key={local.id} local={local} podeConferir admin={user?.role === 'admin'} />}
    </div>
  );
}
