import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Search, Store } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { buscarMarcacaoDaLoja, listarProdutosDaLoja, preencherTextosDoCadastro, salvarMarcacaoDaLoja } from '../services/lojaProdutos';
import { avisosDaPeca, camposDoCadastro, formDaMarcacao, LIMITES, MAX_CARROSSEL, montarCorpo, situacaoDaPeca, validarForm } from '../utils/lojaProdutos';
import { formatarMoeda } from '../utils/mascaras';
import './LojaProdutos.css';

const POR_PAGINA = 20;
const FILTROS = [
  { id: 'todos', rotulo: 'Todas' },
  { id: 'publicados', rotulo: 'Marcadas para a loja' },
  { id: 'nao_publicados', rotulo: 'Fora da loja' },
  { id: 'no_carrossel', rotulo: 'No carrossel' },
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
  const [doCadastro, setDoCadastro] = useState([]);
  const [preenchendo, setPreenchendo] = useState(false);
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

  async function alternarCarrossel(item) {
    setAlternando(item.produto_id);

    try {
      await salvarMarcacaoDaLoja(item.produto_id, { carrossel_novidades: !item.carrossel_novidades });
      toast?.success?.(item.carrossel_novidades ? `"${item.nome}" saiu do carrossel.` : `"${item.nome}" escolhida para o carrossel.`);
      recarregar();
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível alterar o carrossel.');
    } finally {
      setAlternando(0);
    }
  }

  async function alternarDestaque(item) {
    if (!item.destaque_home && !window.confirm(`Definir "${item.nome}" como o destaque da Home?\n\nSó uma peça é o destaque: a que estava antes sai.`)) return;

    setAlternando(item.produto_id);

    try {
      await salvarMarcacaoDaLoja(item.produto_id, { destaque_home: !item.destaque_home });
      toast?.success?.(item.destaque_home ? `"${item.nome}" saiu do destaque.` : `"${item.nome}" é o destaque da Home.`);
      recarregar();
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível alterar o destaque.');
    } finally {
      setAlternando(0);
    }
  }

  async function preencherEmLote() {
    const ok = window.confirm(
      'Copiar a descrição e o material do cadastro para as peças marcadas na loja que ainda estão sem esse texto?\n\n'
      + 'Nada que já foi escrito é trocado. Confira depois em "Editar textos": se a descrição do cadastro tiver anotações internas, apague antes de vender.',
    );

    if (!ok) return;

    setPreenchendo(true);

    try {
      const { atualizados } = await preencherTextosDoCadastro();
      toast?.success?.(atualizados > 0 ? `${atualizados} ${atualizados === 1 ? 'peça atualizada' : 'peças atualizadas'} com o texto do cadastro.` : 'Nenhuma peça precisava de texto: tudo já está preenchido.');
      recarregar();
    } catch (e) {
      toast?.error?.(e.message || 'Não foi possível preencher os textos.');
    } finally {
      setPreenchendo(false);
    }
  }

  async function abrirEdicao(item) {
    if (editando === item.produto_id) { setEditando(0); return; }

    setEditando(item.produto_id);
    setForm(null);
    setDoCadastro([]);
    setErroForm('');
    setCarregandoForm(true);

    try {
      const marcacao = await buscarMarcacaoDaLoja(item.produto_id);
      setForm(formDaMarcacao(marcacao));
      setDoCadastro(camposDoCadastro(marcacao));
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
        <div className="loja-produtos-cabecalho-acoes">
          <button type="button" className="btn btn-ghost" onClick={preencherEmLote} disabled={preenchendo || carregando}>
            {preenchendo ? 'Preenchendo...' : 'Preencher textos vazios com o cadastro'}
          </button>
          <button type="button" className="btn btn-ghost" onClick={recarregar} disabled={carregando}>
            <RefreshCw size={16} />
            Atualizar
          </button>
        </div>
      </div>

      <p className="loja-produtos-aviso">
        Uma peça só aparece na loja se estiver marcada <strong>e</strong> tiver preço no canal &quot;online&quot;. Sem estoque no Central, aparece como indisponível.
      </p>

      <p className="loja-produtos-aviso">
        <strong>Carrossel de novidades da página inicial:</strong> escolha até {MAX_CARROSSEL} peças com o botão &quot;Pôr no carrossel&quot; (a foto principal de cada uma é a que aparece).
        Se nenhuma peça estiver escolhida, o carrossel mostra sozinho as peças que são novidade (entraram no estoque nos últimos 30 dias). Só entra peça que aparece na loja e tem foto.
        Veja as escolhidas na aba &quot;No carrossel&quot;.
      </p>

      <p className="loja-produtos-aviso">
        <strong>Destaque da Home:</strong> é a peça do momento, a que a loja quer vender com mais força, mostrada em uma área própria da página inicial.
        Use o botão &quot;Definir como destaque&quot; (só uma peça por vez: ao escolher outra, a anterior sai). Sem peça escolhida, a Home usa sozinha uma peça disponível com foto.
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
                  <div><dt>Destaque da Home</dt><dd>{item.destaque_home ? 'Sim' : 'Não'}</dd></div>
                  <div><dt>Carrossel</dt><dd>{item.carrossel_novidades ? 'Escolhida' : 'Automático'}</dd></div>
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
                  {(item.visivel || item.destaque_home) && (
                    <button type="button" className={`btn ${item.destaque_home ? 'btn-primary' : 'btn-ghost'}`} disabled={alternando === item.produto_id} onClick={() => alternarDestaque(item)}>
                      {item.destaque_home ? 'Tirar do destaque' : 'Definir como destaque'}
                    </button>
                  )}
                  {(item.visivel || item.carrossel_novidades) && (
                    <button type="button" className="btn btn-ghost" disabled={alternando === item.produto_id} onClick={() => alternarCarrossel(item)}>
                      {item.carrossel_novidades ? 'Tirar do carrossel' : 'Pôr no carrossel'}
                    </button>
                  )}
                  <button type="button" className="btn btn-ghost" aria-expanded={aberto} onClick={() => abrirEdicao(item)}>
                    {aberto ? 'Fechar textos' : 'Editar textos'}
                  </button>
                </div>

                {aberto && (
                  <div className="loja-produtos-form">
                    {carregandoForm && <div role="status"><span className="spinner" /> Carregando textos...</div>}

                    {form && (
                      <form noValidate onSubmit={(e) => { e.preventDefault(); salvarTextos(item); }}>
                        {doCadastro.length > 0 && (
                          <p className="loja-produtos-aviso" role="status">
                            Já preenchemos com o que está no cadastro do produto ({doCadastro.join(', ')}). Confira, ajuste se quiser e salve:
                            só vai para a loja depois de salvar.
                          </p>
                        )}
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
                          <span>Cuidados (deixe em branco para usar o texto padrão de cuidados da loja)</span>
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
