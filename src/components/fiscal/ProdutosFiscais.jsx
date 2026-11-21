import { useEffect, useState } from 'react';
import { aplicarFiscalEmLote, atualizarProdutoFiscal, listarProdutosFiscais } from '../../services/fiscal';
import {
  ORIGENS, dadosDoLote, mascararNcm, mudancasDoProduto, validarCampoProduto, validarLote,
} from '../../utils/fiscal';
import { useToast } from '../../context/ToastContext';

const POR_PAGINA = 20;
const LOTE_VAZIO = { ncm: '', cest: '', origem_mercadoria: '', unidade_fiscal: '' };

const paraLinha = p => ({ ncm: p.ncm ? mascararNcm(p.ncm) : '', cest: p.cest ?? '', origem_mercadoria: p.origem_mercadoria === null ? '' : String(p.origem_mercadoria), unidade_fiscal: p.unidade_fiscal ?? '' });

// NCM, origem e unidade fiscal dos produtos vendidos: edição por linha e aplicação em lote nos selecionados.
export default function ProdutosFiscais({ onMudou }) {
  const toast = useToast();
  const [filtro, setFiltro] = useState('pendentes');
  const [busca, setBusca] = useState('');
  const [q, setQ] = useState('');
  const [pagina, setPagina] = useState(1);
  const [versao, setVersao] = useState(0);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [edicao, setEdicao] = useState({}); // id -> campos digitados
  const [selecionados, setSelecionados] = useState(new Set());
  const [lote, setLote] = useState(LOTE_VAZIO);
  const [trabalhando, setTrabalhando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    listarProdutosFiscais({ filtro, q, page: pagina, pageSize: POR_PAGINA })
      .then(resposta => { if (!cancelado) { setDados(resposta); setErro(''); } })
      .catch(err => { if (!cancelado) setErro(err.message); });
    return () => { cancelado = true; };
  }, [filtro, q, pagina, versao]);

  const itens = dados?.items ?? [];
  const recarregar = () => { setVersao(v => v + 1); onMudou?.(); };
  const linha = p => edicao[p.id] ?? paraLinha(p);
  const mudar = (p, campo, valor) => setEdicao(e => ({ ...e, [p.id]: { ...linha(p), [campo]: valor } }));

  async function salvarLinha(p) {
    const digitado = linha(p);
    for (const campo of ['ncm', 'cest', 'unidade_fiscal']) {
      const e = validarCampoProduto(campo, digitado[campo]);
      if (e) { toast.error(e); return; }
    }
    const corpo = mudancasDoProduto(p, digitado);
    if (!Object.keys(corpo).length) return;
    setTrabalhando(true);
    try {
      await atualizarProdutoFiscal(p.id, corpo);
      setEdicao(e => { const novo = { ...e }; delete novo[p.id]; return novo; });
      toast.success('Produto atualizado.');
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTrabalhando(false);
    }
  }

  async function aplicarLote() {
    const aplicar = dadosDoLote(lote);
    const ids = [...selecionados];
    const erroLote = validarLote(ids, aplicar);
    if (erroLote) { toast.error(erroLote); return; }
    setTrabalhando(true);
    try {
      const r = await aplicarFiscalEmLote(ids, aplicar);
      toast.success(`${r.atualizados} ${r.atualizados === 1 ? 'produto atualizado' : 'produtos atualizados'}.`);
      setSelecionados(new Set());
      setLote(LOTE_VAZIO);
      setEdicao({});
      recarregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTrabalhando(false);
    }
  }

  const alternar = id => setSelecionados(s => { const novo = new Set(s); if (novo.has(id)) novo.delete(id); else novo.add(id); return novo; });
  const todosNaPagina = itens.length > 0 && itens.every(p => selecionados.has(p.id));

  return (
    <div>
      <div className="rel-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="pf-filtro">Mostrar</label>
          <select id="pf-filtro" className="input-field" value={filtro} onChange={e => { setFiltro(e.target.value); setPagina(1); }}>
            <option value="pendentes">Só pendentes (sem NCM ou sem origem)</option>
            <option value="todos">Todos os produtos vendidos</option>
          </select>
        </div>
        <form className="input-wrapper" onSubmit={e => { e.preventDefault(); setQ(busca.trim()); setPagina(1); }}>
          <label className="input-label" htmlFor="pf-busca">Buscar por nome ou SKU</label>
          <input id="pf-busca" type="search" className="input-field" value={busca} onChange={e => setBusca(e.target.value)} />
        </form>
      </div>

      {selecionados.size > 0 && (
        <div className="card card-padding fiscal-lote">
          <strong>{selecionados.size} {selecionados.size === 1 ? 'produto selecionado' : 'produtos selecionados'}</strong>
          <p className="text-sm text-secondary">Aplica o que você preencher a todos os selecionados (campo vazio não muda nada).</p>
          <div className="fiscal-form-linha">
            <input type="text" className="input-field" aria-label="NCM do lote" placeholder="NCM (8 dígitos)" value={lote.ncm} onChange={e => setLote(l => ({ ...l, ncm: e.target.value }))} />
            <select className="input-field" aria-label="Origem do lote" value={lote.origem_mercadoria} onChange={e => setLote(l => ({ ...l, origem_mercadoria: e.target.value }))}>
              <option value="">Origem…</option>
              {ORIGENS.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
            </select>
            <input type="text" className="input-field" aria-label="Unidade fiscal do lote" placeholder="Unidade (UN, KG…)" value={lote.unidade_fiscal} onChange={e => setLote(l => ({ ...l, unidade_fiscal: e.target.value }))} />
            <button type="button" className="btn btn-primary" disabled={trabalhando} onClick={aplicarLote}>Aplicar aos selecionados</button>
          </div>
        </div>
      )}

      {erro && <div className="empty-state"><div className="empty-state-title">Não foi possível carregar os produtos</div><p className="text-sm text-secondary">{erro}</p></div>}
      {!erro && dados && itens.length === 0 && (
        <div className="empty-state"><div className="empty-state-title">{filtro === 'pendentes' ? 'Nenhum produto pendente' : 'Nenhum produto encontrado'}</div></div>
      )}

      {!erro && itens.length > 0 && (
        <div className="card rel-table-card">
          <div className="rel-table-scroll">
            <table className="rel-table">
              <thead>
                <tr>
                  <th><input type="checkbox" aria-label="Selecionar todos da página" checked={todosNaPagina} onChange={() => setSelecionados(s => { const novo = new Set(s); itens.forEach(p => (todosNaPagina ? novo.delete(p.id) : novo.add(p.id))); return novo; })} /></th>
                  <th>Produto</th><th>NCM</th><th>Origem</th><th>Unidade</th><th>CEST</th><th />
                </tr>
              </thead>
              <tbody>
                {itens.map(p => {
                  const l = linha(p);
                  const sujo = Object.keys(mudancasDoProduto(p, l)).length > 0;
                  return (
                    <tr key={p.id} className="rel-row">
                      <td><input type="checkbox" aria-label={`Selecionar ${p.nome}`} checked={selecionados.has(p.id)} onChange={() => alternar(p.id)} /></td>
                      <td>{p.nome}<br /><span className="text-sm text-secondary">{p.sku ?? 'sem SKU'}</span></td>
                      <td><input type="text" className="input-field fiscal-campo" aria-label={`NCM de ${p.nome}`} value={l.ncm} onChange={e => mudar(p, 'ncm', e.target.value)} placeholder="0000.00.00" /></td>
                      <td>
                        <select className="input-field fiscal-campo" aria-label={`Origem de ${p.nome}`} value={l.origem_mercadoria} onChange={e => mudar(p, 'origem_mercadoria', e.target.value)}>
                          <option value="">—</option>
                          {ORIGENS.map(o => <option key={o.valor} value={o.valor}>{o.rotulo}</option>)}
                        </select>
                      </td>
                      <td><input type="text" className="input-field fiscal-campo fiscal-campo--curto" aria-label={`Unidade fiscal de ${p.nome}`} value={l.unidade_fiscal} onChange={e => mudar(p, 'unidade_fiscal', e.target.value)} placeholder={p.unidade} /></td>
                      <td><input type="text" className="input-field fiscal-campo fiscal-campo--curto" aria-label={`CEST de ${p.nome}`} value={l.cest} onChange={e => mudar(p, 'cest', e.target.value)} /></td>
                      <td><button type="button" className="btn btn-secondary btn-sm" disabled={!sujo || trabalhando} onClick={() => salvarLinha(p)}>Salvar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dados.totalPages > 1 && (
            <div className="rel-paginacao">
              <button type="button" className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)}>Anterior</button>
              <span className="text-sm text-secondary">Página {dados.page} de {dados.totalPages}</span>
              <button type="button" className="btn btn-ghost btn-sm" disabled={pagina >= dados.totalPages} onClick={() => setPagina(pagina + 1)}>Próxima</button>
            </div>
          )}
        </div>
      )}
      <p className="text-sm text-secondary">NCM e CEST são conferidos só pelo formato, não contra a tabela oficial. Na dúvida sobre o NCM ou a origem, confirme com o seu contador.</p>
    </div>
  );
}
