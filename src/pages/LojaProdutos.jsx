import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search, Store } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { buscarMarcacaoDaLoja, listarProdutosDaLoja, salvarMarcacaoDaLoja } from '../services/lojaProdutos';
import { avisosDaPeca, formDaMarcacao, LIMITES, montarCorpo, situacaoDaPeca, validarForm } from '../utils/lojaProdutos';
import { formatarMoeda } from '../utils/mascaras';
import './LojaProdutos.css';

const POR_PAGINA = 20;
const FILTROS = [
  { id: 'todos', rotulo: 'Todas' },
  { id: 'publicados', rotulo: 'Marcadas para a loja' },
  { id: 'nao_publicados', rotulo: 'Fora da loja' },
];

// Escolha de quais peças aparecem na loja online e dos textos de cada uma. Só admin, só com a funcionalidade
// `loja_online`; o backend decide de novo. Preço (canal online) e estoque continuam nas telas de sempre.
export default function LojaProdutos() {
  const toast = useToast();
  const [filtro, setFiltro] = useState('todos');
  const [buscaDigitada, setBuscaDigitada] = useState('');
  const [busca, setBusca] = useState('');
  const [pagina, setPagina] = useState(1);
  const [dados, setDados] = useState({ itens: [], total: 0 });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [recarga, setRecarga] = useState(0);
  const [alternando, setAlternando] = useState(0);
  const [editando, setEditando] = useState(0);
  const [form, setForm] = useState(null);
  const [carregandoForm, setCarregandoForm] = useState(false);
  const [erroForm, setErroForm] = useState('');
  const [salvando, setSalvando] = useState(false);

  // "Carregando" é ligado nos eventos; o efeito só busca e guarda o resultado.
  const recarregar = () => { setCarregando(true); setRecarga((n) => n + 1); };
  const mudarFiltro = (id) => { setCarregando(true); setFiltro(id); setPagina(1); };
  const irParaPagina = (n) => { setCarregando(true); setPagina(n); };
  const buscar = (e) => { e.preventDefault(); setCarregando(true); setBusca(buscaDigitada.trim()); setPagina(1); };

  useEffect(() => {
    let cancelado = false;

    listarProdutosDaLoja({ situacao: filtro, busca, pagina, limite: POR_PAGINA })
      .then((resposta) => { if (!cancelado) { setDados(resposta); setErro(''); } })
      .catch((e) => { if (!cancelado) setErro(e.message || 'Não foi possível carregar os produtos.'); })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [filtro, busca, pagina, recarga]);

  async function alternar(item) {
    setAlternando(item.produto_id);

    try {
      await salvarMarcacaoDaLoja(item.produto_id, { visivel: !item.visivel });
      toast?.success?.(item.visivel ? `"${item.nome}" saiu da loja.` : `"${item.nome}" marcada para a loja.`);
      recarregar();
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível alterar a peça.');
    } finally {
      setAlternando(0);
    }
  }

  async function abrirEdicao(item) {
    if (editando === item.produto_id) { setEditando(0); return; }

    setEditando(item.produto_id);
    setForm(null);
    setErroForm('');
    setCarregandoForm(true);

    try {
      setForm(formDaMarcacao(await buscarMarcacaoDaLoja(item.produto_id)));
    } catch (e) {
      setErroForm(e.message || 'Não foi possível carregar os textos da peça.');
    } finally {
      setCarregandoForm(false);
    }
  }

  async function salvarTextos(item) {
    const problema = validarForm(form);

    if (problema) { setErroForm(problema); return; }

    setSalvando(true);
    setErroForm('');

    try {
      await salvarMarcacaoDaLoja(item.produto_id, montarCorpo(form));
      toast?.success?.(`Textos de "${item.nome}" salvos.`);
      setEditando(0);
      recarregar();
    } catch (e) {
      setErroForm(e.message || 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  const campo = (nome) => (e) => setForm((atual) => ({ ...atual, [nome]: e.target.value }));
  const totalPaginas = Math.max(1, Math.ceil(dados.total / POR_PAGINA));

  return (
    <div className="page-content loja-produtos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Loja online</h1>
          <p className="page-subtitle">Escolha quais peças aparecem na loja e ajuste os textos. O preço do canal online e o estoque continuam nas telas de sempre.</p>
        </div>
        <button type="button" className="btn btn-ghost" onClick={recarregar} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </div>

      <p className="loja-produtos-aviso">
        Uma peça só aparece na loja se estiver marcada <strong>e</strong> tiver preço no canal &quot;online&quot;. Sem estoque no Central, aparece como indisponível.
      </p>

      <form className="loja-produtos-filtros" onSubmit={buscar} role="search">
        <div className="loja-produtos-abas" role="group" aria-label="Filtro por situação">
          {FILTROS.map((f) => (
            <button key={f.id} type="button" aria-pressed={filtro === f.id} className={`btn ${filtro === f.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => mudarFiltro(f.id)}>
              {f.rotulo}
            </button>
          ))}
        </div>
        <div className="loja-produtos-busca">
          <input className="input" type="search" maxLength={80} placeholder="Buscar peça pelo nome" aria-label="Buscar peça pelo nome" value={buscaDigitada} onChange={(e) => setBuscaDigitada(e.target.value)} />
          <button type="submit" className="btn btn-ghost"><Search size={16} /> Buscar</button>
        </div>
      </form>

      {erro && <div className="loja-produtos-erro" role="alert">{erro}</div>}

      {carregando && (
        <div className="card card-padding" role="status">
          <span className="spinner" /> Carregando peças...
        </div>
      )}

      {!carregando && !erro && dados.itens.length === 0 && (
        <div className="card empty-state">
          <Store className="empty-state-icon" size={36} />
          <div className="empty-state-title">Nenhuma peça encontrada</div>
          <p className="text-sm text-secondary">Só entram produtos acabados e ativos. Cadastre ou ative a peça em Produtos.</p>
        </div>
      )}

      {!carregando && dados.itens.length > 0 && (
        <ul className="loja-produtos-lista">
          {dados.itens.map((item) => {
            const situacao = situacaoDaPeca(item);
            const avisos = avisosDaPeca(item);
            const aberto = editando === item.produto_id;

            return (
              <li key={item.produto_id} className="loja-produtos-item card card-padding">
                <div className="loja-produtos-topo">
                  <div>
                    <div className="loja-produtos-nome">{item.titulo || item.nome}</div>
                    {item.titulo && <div className="loja-produtos-interno">Nome interno: {item.nome}</div>}
                  </div>
                  <span className={`loja-produtos-selo ${situacao.tom}`}>{situacao.rotulo}</span>
                </div>

                <dl className="loja-produtos-dados">
                  <div><dt>Preço online</dt><dd>{item.preco_online === null ? 'sem preço' : formatarMoeda(item.preco_online)}</dd></div>
                  <div><dt>Estoque (Central)</dt><dd>{item.saldo_central}</dd></div>
                  <div><dt>Fotos</dt><dd>{item.fotos}</dd></div>
                  <div><dt>Ordem</dt><dd>{item.ordem}</dd></div>
                </dl>

                {avisos.length > 0 && (
                  <ul className="loja-produtos-avisos">
                    {avisos.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                )}

                <div className="loja-produtos-acoes">
                  <button type="button" className={`btn ${item.visivel ? 'btn-ghost' : 'btn-primary'}`} disabled={alternando === item.produto_id} onClick={() => alternar(item)}>
                    {alternando === item.produto_id ? 'Salvando...' : item.visivel ? 'Tirar da loja' : 'Mostrar na loja'}
                  </button>
                  <button type="button" className="btn btn-ghost" aria-expanded={aberto} onClick={() => abrirEdicao(item)}>
                    {aberto ? 'Fechar textos' : 'Editar textos'}
                  </button>
                </div>

                {aberto && (
                  <div className="loja-produtos-form">
                    {carregandoForm && <div role="status"><span className="spinner" /> Carregando textos...</div>}

                    {form && (
                      <form onSubmit={(e) => { e.preventDefault(); salvarTextos(item); }}>
                        <p className="text-sm text-secondary">Deixe em branco o que não souber: a loja não mostra texto inventado.</p>

                        <label className="loja-produtos-campo">
                          <span>Título na loja (se vazio, usa o nome interno)</span>
                          <input className="input" type="text" maxLength={LIMITES.titulo} value={form.titulo} onChange={campo('titulo')} />
                        </label>
                        <label className="loja-produtos-campo">
                          <span>Descrição</span>
                          <textarea className="input" rows={4} maxLength={LIMITES.descricao} value={form.descricao} onChange={campo('descricao')} />
                        </label>
                        <label className="loja-produtos-campo">
                          <span>Materiais</span>
                          <textarea className="input" rows={2} maxLength={LIMITES.materiais} value={form.materiais} onChange={campo('materiais')} />
                        </label>
                        <label className="loja-produtos-campo">
                          <span>Cuidados</span>
                          <textarea className="input" rows={2} maxLength={LIMITES.cuidados} value={form.cuidados} onChange={campo('cuidados')} />
                        </label>
                        <label className="loja-produtos-campo curto">
                          <span>Ordem na vitrine (menor aparece primeiro)</span>
                          <input className="input" type="number" min={0} max={LIMITES.ordem} step={1} value={form.ordem} onChange={campo('ordem')} />
                        </label>

                        <div className="loja-produtos-acoes">
                          <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar textos'}</button>
                          <button type="button" className="btn btn-ghost" onClick={() => setEditando(0)} disabled={salvando}>Cancelar</button>
                        </div>
                      </form>
                    )}

                    {erroForm && <div className="loja-produtos-erro" role="alert">{erroForm}</div>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="loja-produtos-paginacao">
          <button type="button" className="btn btn-ghost" disabled={pagina <= 1 || carregando} onClick={() => irParaPagina(pagina - 1)}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-sm text-secondary">Página {pagina} de {totalPaginas}</span>
          <button type="button" className="btn btn-ghost" disabled={pagina >= totalPaginas || carregando} onClick={() => irParaPagina(pagina + 1)}>
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
