import { useCallback, useEffect, useState } from 'react';
import { Layers, Plus } from 'lucide-react';
import { buscarGrade, listarGrades } from '../services/grades';
import NovaGradeModal from '../components/NovaGradeModal';
import GradeDetalheModal from '../components/GradeDetalheModal';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import './Grades.css';

const POR_PAGINA = 20;

export default function Grades() {
  const toast = useToast();
  const { user } = useAuth();
  const podeCriar = user?.role === 'admin';
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [versao, setVersao] = useState(0);
  const [novaAberta, setNovaAberta] = useState(false);
  const [aberta, setAberta] = useState(null);

  useEffect(() => {
    let cancelado = false;
    listarGrades({ page: pagina, pageSize: POR_PAGINA })
      .then(resposta => { if (!cancelado) { setDados(resposta); setError(''); } })
      .catch(err => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [pagina, versao]);

  const recarregar = useCallback(() => setVersao(v => v + 1), []);

  async function abrir(id) {
    try {
      setAberta(await buscarGrade(id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  const itens = dados?.items ?? [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Grades de produtos</h1>
          <p className="page-subtitle">Produtos com variações de tamanho, cor e outros, cada uma com SKU e estoque próprios</p>
        </div>
        {podeCriar && (
          <button type="button" className="btn btn-primary" onClick={() => setNovaAberta(true)}>
            <Plus size={16} /> Nova grade
          </button>
        )}
      </div>

      {loading && <div className="empty-state"><p className="text-sm text-secondary">Carregando grades...</p></div>}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar as grades</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && itens.length === 0 && (
        <div className="empty-state">
          <Layers size={28} aria-hidden="true" />
          <div className="empty-state-title">Nenhuma grade criada</div>
          <p className="text-sm text-secondary">Crie uma grade para cadastrar de uma vez todas as combinações de tamanho e cor de um produto.</p>
        </div>
      )}

      {!loading && !error && itens.length > 0 && (
        <div className="grade-lista">
          {itens.map(g => (
            <button key={g.id} type="button" className="card card-padding grade-item" onClick={() => abrir(g.id)}>
              <span>
                <span className="grade-item-titulo">{g.nome}</span>
                <span className="grade-item-sub"> {g.eixos.join(' · ')}</span>
              </span>
              <span className="grade-item-badges">
                <span className="badge badge-info">{g.variacoes} {g.variacoes === 1 ? 'variação' : 'variações'}</span>
                <span className="badge">{g.estoque_total} em estoque</span>
              </span>
            </button>
          ))}
          {dados.totalPages > 1 && (
            <div className="grade-paginacao">
              <button type="button" className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <span className="text-sm text-secondary">Página {dados.page} de {dados.totalPages}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={pagina >= dados.totalPages} onClick={() => setPagina(pagina + 1)}>Próxima</button>
            </div>
          )}
        </div>
      )}

      <NovaGradeModal
        open={novaAberta}
        onClose={() => setNovaAberta(false)}
        onCreated={resultado => {
          setNovaAberta(false);
          const semSku = resultado.variacoes.filter(v => !v.sku).length;
          toast.success(`Grade criada com ${resultado.variacoes.length} variações${semSku ? ` (${semSku} sem SKU: categorize em Produtos)` : ''}.`);
          recarregar();
          abrir(resultado.grade.id);
        }}
      />

      {aberta && (
        <GradeDetalheModal
          key={`${aberta.grade.id}-${aberta.variacoes.length}`}
          dados={aberta}
          onClose={() => setAberta(null)}
          onChanged={() => { toast.success('Variações criadas.'); recarregar(); abrir(aberta.grade.id); }}
        />
      )}
    </div>
  );
}
