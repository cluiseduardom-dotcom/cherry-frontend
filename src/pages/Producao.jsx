import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, FlaskConical, Plus } from 'lucide-react';
import { listarOrdens, buscarOrdem } from '../services/producao';
import { listarTodosProdutos } from '../services/produtos';
import { FILTROS_STATUS, STATUS_ORDEM, formatarPrazo, produtosProduziveis, rotuloStatus } from '../utils/producao';
import NovaOrdemProducaoModal from '../components/NovaOrdemProducaoModal';
import OrdemProducaoModal from '../components/OrdemProducaoModal';
import FichaTecnicaModal from '../components/FichaTecnicaModal';
import { useToast } from '../context/ToastContext';
import './Producao.css';

const POR_PAGINA = 20;

export default function Producao() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [versao, setVersao] = useState(0); // muda para recarregar a lista

  const [novaAberta, setNovaAberta] = useState(false);
  const [ordemAberta, setOrdemAberta] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [produtoFicha, setProdutoFicha] = useState(null);
  const [escolhaFicha, setEscolhaFicha] = useState('');

  useEffect(() => {
    let cancelado = false;
    listarTodosProdutos()
      .then(({ items }) => { if (!cancelado) setProdutos(produtosProduziveis(items)); })
      .catch(() => { /* o seletor de fichas fica vazio; a lista de ordens não depende dele */ });
    return () => { cancelado = true; };
  }, []);

  useEffect(() => {
    let cancelado = false;
    listarOrdens({ status, page: pagina, pageSize: POR_PAGINA })
      .then(resposta => {
        if (cancelado) return;
        setDados(resposta);
        setError('');
      })
      .catch(err => { if (!cancelado) setError(err.message); })
      .finally(() => { if (!cancelado) setLoading(false); });
    return () => { cancelado = true; };
  }, [status, pagina, versao]);

  const recarregar = useCallback(() => setVersao(v => v + 1), []);

  async function abrirOrdem(id) {
    try {
      setOrdemAberta(await buscarOrdem(id));
    } catch (err) {
      toast.error(err.message);
    }
  }

  function mudarFiltro(valor) {
    setLoading(true);
    setStatus(valor);
    setPagina(1);
  }

  const itens = dados?.items ?? [];

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Produção</h1>
          <p className="page-subtitle">Ordens de produção: planeje, acompanhe e registre o que foi produzido</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={() => setNovaAberta(true)}>
          <Plus size={16} /> Nova ordem
        </button>
      </div>

      <div className="card card-padding producao-ficha-card">
        <h2 className="section-title"><FlaskConical size={16} aria-hidden="true" /> Fichas técnicas</h2>
        <p className="text-sm text-secondary">A ficha técnica (receita) diz quanto de cada insumo uma receita leva, quanto custa e quantas unidades ela rende. Na ordem você escolhe quantas receitas produzir (1, 0,5, 2…) e o consumo de insumos acompanha. Sem a ficha, não há como criar a ordem. Também dá para abri-la em Produtos.</p>
        <div className="rel-filtros">
          <div className="input-wrapper">
            <label className="input-label" htmlFor="pf-produto">Produto</label>
            <select id="pf-produto" className="input-field" value={escolhaFicha} onChange={e => setEscolhaFicha(e.target.value)}>
              <option value="">Escolha o produto</option>
              {produtos.map(p => <option key={p.id} value={p.id}>{p.sku ? `${p.sku} — ` : ''}{p.nome}</option>)}
            </select>
          </div>
          <button type="button" className="btn btn-secondary" disabled={!escolhaFicha} onClick={() => setProdutoFicha(produtos.find(p => String(p.id) === escolhaFicha))}>
            Abrir ficha técnica
          </button>
        </div>
      </div>

      <div className="producao-filtros" role="group" aria-label="Filtrar por situação">
        {FILTROS_STATUS.map(f => (
          <button key={f.valor} type="button" className={`btn btn-ghost btn-sm${status === f.valor ? ' producao-filtro--ativo' : ''}`} onClick={() => mudarFiltro(f.valor)}>
            {f.rotulo}
          </button>
        ))}
      </div>

      {loading && <div className="empty-state"><p className="text-sm text-secondary">Carregando ordens...</p></div>}

      {!loading && error && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar as ordens</div>
          <p className="text-sm text-secondary">{error}</p>
        </div>
      )}

      {!loading && !error && itens.length === 0 && (
        <div className="empty-state">
          <ClipboardList size={28} aria-hidden="true" />
          <div className="empty-state-title">Nenhuma ordem de produção{status ? ` ${rotuloStatus(status).toLowerCase()}` : ''}</div>
          <p className="text-sm text-secondary">Crie uma ordem para planejar o que vai produzir.</p>
        </div>
      )}

      {!loading && !error && itens.length > 0 && (
        <div className="producao-lista">
          {itens.map(o => (
            <button key={o.id} type="button" className="card card-padding producao-item" onClick={() => abrirOrdem(o.id)}>
              <span>
                <span className="producao-item-titulo">#{o.id} · {o.produto_nome}</span>
                <span className="producao-item-sub">
                  {' '}Planejado: {o.quantidade_planejada} un.
                  {o.status === 'concluida' ? ` · Produzido: ${o.quantidade_produzida} un.` : ''}
                  {o.prazo ? ` · Prazo: ${formatarPrazo(o.prazo)}` : ''}
                </span>
              </span>
              <span className="producao-item-badges">
                {o.tem_pendencia && <span className="badge badge-warning">Insumo pendente</span>}
                <span className={`badge ${STATUS_ORDEM[o.status]?.badge ?? ''}`}>{rotuloStatus(o.status)}</span>
              </span>
            </button>
          ))}
          {dados.totalPages > 1 && (
            <div className="producao-paginacao">
              <button type="button" className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <span className="text-sm text-secondary">Página {dados.page} de {dados.totalPages}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={pagina >= dados.totalPages} onClick={() => setPagina(pagina + 1)}>Próxima</button>
            </div>
          )}
        </div>
      )}

      <NovaOrdemProducaoModal
        open={novaAberta}
        onClose={() => setNovaAberta(false)}
        onCreated={ordem => {
          setNovaAberta(false);
          toast.success('Ordem criada.');
          recarregar();
          abrirOrdem(ordem.id);
        }}
        onAbrirFicha={produto => setProdutoFicha(produto)}
      />

      {ordemAberta && (
        <OrdemProducaoModal
          key={`${ordemAberta.id}-${ordemAberta.status}-${ordemAberta.tem_pendencia}`}
          ordem={ordemAberta}
          onClose={() => setOrdemAberta(null)}
          onChanged={atualizada => {
            setOrdemAberta(atualizada);
            recarregar();
            toast.success('Ordem atualizada.');
          }}
        />
      )}

      <FichaTecnicaModal
        open={Boolean(produtoFicha)}
        produto={produtoFicha}
        onClose={() => setProdutoFicha(null)}
        onSaved={() => {
          setProdutoFicha(null);
          toast.success('Ficha técnica salva.');
        }}
      />
    </div>
  );
}
