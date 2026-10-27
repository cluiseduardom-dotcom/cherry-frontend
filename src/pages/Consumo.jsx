import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { listarUsuarios } from '../services/usuarios';
import {
  listarInsumos, registrarConsumoAvulso, listarConsumosAvulsos, consumosDaVenda,
  acrescentarConsumoNaVenda, retirarConsumoDaVenda, regularizarConsumoDaVenda,
  previaSubstituicao, substituirInsumo, relatorioConsumo,
} from '../services/consumos';
import {
  MOTIVOS_AVULSO, MOTIVOS_VENDA, ROTULO_MOTIVO, ROTULO_ESTADO,
  validarAvulso, montarAvulso, validarLinhaVenda, podeRetirar, podeRegularizar, formatarCusto,
} from '../utils/consumos';
import './Compras.css';

const ABAS = [
  { key: 'avulso', label: 'Consumo avulso' },
  { key: 'venda', label: 'Consumo por venda' },
  { key: 'substituicao', label: 'Substituição em lote' },
  { key: 'relatorio', label: 'Relatório' },
];

const rotuloInsumo = i => `${i.sku ? `${i.sku} — ` : ''}${i.nome} (saldo ${i.saldo_central})`;
const dataBR = v => (v ? new Date(v).toLocaleString('pt-BR') : '—');

function Erro({ msg }) {
  return msg ? <div className="modal-error" role="alert">{msg}</div> : null;
}

function SelectInsumo({ id, insumos, value, onChange, label = 'Insumo' }) {
  return (
    <div className="input-wrapper">
      <label className="input-label" htmlFor={id}>{label}</label>
      <select id={id} className="input-field" value={value} onChange={e => onChange(e.target.value)}>
        <option value="">Escolha o insumo</option>
        {insumos.map(i => <option key={i.id} value={i.id}>{rotuloInsumo(i)}</option>)}
      </select>
    </div>
  );
}

function Avulso({ insumos, recarregarInsumos }) {
  const toast = useToast();
  const [responsaveis, setResponsaveis] = useState([]);
  const [form, setForm] = useState({ produto_id: '', quantidade: '', motivo: '', responsavel_id: '', finalidade: '', observacao: '' });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState({ items: [], total: 0 });

  const carregar = useCallback(() => {
    listarConsumosAvulsos({ pageSize: 50 })
      .then(d => setHistorico({ items: d?.items ?? [], total: d?.total ?? 0 }))
      .catch(err => setErro(err.message));
  }, []);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => {
    // Lista de usuários é restrita; sem permissão o responsável fica em branco (assume quem registra).
    listarUsuarios().then(l => setResponsaveis(Array.isArray(l) ? l : (l?.items ?? []))).catch(() => setResponsaveis([]));
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  async function enviar(e) {
    e.preventDefault();
    const v = validarAvulso(form);
    if (v) { setErro(v); return; }
    setErro('');
    setSalvando(true);
    try {
      await registrarConsumoAvulso(montarAvulso(form));
      toast.success('Consumo registrado.');
      setForm({ produto_id: '', quantidade: '', motivo: '', responsavel_id: '', finalidade: '', observacao: '' });
      carregar();
      recarregarInsumos();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  const temCusto = historico.items.some(i => i.custo_unitario !== undefined);

  return (
    <>
      <form className="card" style={{ padding: 16, marginBottom: 16 }} onSubmit={enviar} noValidate>
        <Erro msg={erro} />
        <div className="modal-form-grid">
          <SelectInsumo id="cav-insumo" insumos={insumos} value={form.produto_id} onChange={v => set('produto_id', v)} />
          <div className="input-wrapper">
            <label className="input-label" htmlFor="cav-qtd">Quantidade</label>
            <input id="cav-qtd" type="number" min="1" step="1" className="input-field" value={form.quantidade} onChange={e => set('quantidade', e.target.value)} />
          </div>
          <div className="input-wrapper">
            <label className="input-label" htmlFor="cav-motivo">Motivo</label>
            <select id="cav-motivo" className="input-field" value={form.motivo} onChange={e => set('motivo', e.target.value)}>
              <option value="">Escolha o motivo</option>
              {MOTIVOS_AVULSO.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {responsaveis.length > 0 && (
            <div className="input-wrapper">
              <label className="input-label" htmlFor="cav-resp">Responsável</label>
              <select id="cav-resp" className="input-field" value={form.responsavel_id} onChange={e => set('responsavel_id', e.target.value)}>
                <option value="">Eu mesmo</option>
                {responsaveis.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
          )}
          <div className="input-wrapper">
            <label className="input-label" htmlFor="cav-fin">Finalidade{form.motivo === 'uso_interno' ? ' *' : ''}</label>
            <input id="cav-fin" type="text" className="input-field" value={form.finalidade} onChange={e => set('finalidade', e.target.value)} />
          </div>
          <div className="input-wrapper">
            <label className="input-label" htmlFor="cav-obs">Observação</label>
            <input id="cav-obs" type="text" className="input-field" value={form.observacao} onChange={e => set('observacao', e.target.value)} />
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Registrando…' : 'Registrar consumo'}</button>
      </form>

      <h3>Histórico ({historico.total})</h3>
      {historico.items.length === 0 ? <p className="text-sm text-secondary">Nenhum consumo avulso registrado.</p> : (
        <div className="card compras-table-wrap">
          <table className="compras-table">
            <thead>
              <tr><th>Data</th><th>Insumo</th><th>Qtd</th><th>Motivo</th><th>Responsável</th><th>Finalidade / obs.</th>{temCusto && <th>Custo un.</th>}</tr>
            </thead>
            <tbody>
              {historico.items.map(i => (
                <tr key={i.id}>
                  <td>{dataBR(i.criado_em)}</td>
                  <td>{i.sku ? `${i.sku} — ` : ''}{i.nome}</td>
                  <td>{i.quantidade}</td>
                  <td>{ROTULO_MOTIVO[i.motivo] ?? i.motivo}</td>
                  <td>{i.responsavel_nome ?? '—'}</td>
                  <td>{[i.finalidade, i.observacao].filter(Boolean).join(' · ') || '—'}</td>
                  {temCusto && <td>{formatarCusto(i.custo_unitario) ?? '—'}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function PorVenda({ insumos, recarregarInsumos }) {
  const toast = useToast();
  const [vendaId, setVendaId] = useState('');
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState({ produto_id: '', quantidade: '', motivo: '', observacao: '' });
  const [ocupado, setOcupado] = useState(false);

  async function carregar(id) {
    setErro('');
    try {
      setDados(await consumosDaVenda(id));
    } catch (err) {
      setDados(null);
      setErro(err.message);
    }
  }

  function buscar(e) {
    e.preventDefault();
    if (!Number.isInteger(Number(vendaId)) || Number(vendaId) <= 0) { setErro('Informe o número da venda'); return; }
    carregar(Number(vendaId));
  }

  async function acao(fn, msg) {
    setOcupado(true);
    setErro('');
    try {
      await fn();
      toast.success(msg);
      await carregar(dados.venda.id);
      recarregarInsumos();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  function acrescentar(e) {
    e.preventDefault();
    const v = validarLinhaVenda(form);
    if (v) { setErro(v); return; }
    const payload = { produto_id: Number(form.produto_id), quantidade: Number(form.quantidade), motivo: form.motivo };
    if (form.observacao.trim()) payload.observacao = form.observacao.trim();
    acao(async () => {
      await acrescentarConsumoNaVenda(dados.venda.id, payload);
      setForm({ produto_id: '', quantidade: '', motivo: '', observacao: '' });
    }, 'Consumo acrescentado.');
  }

  const temCusto = dados?.linhas?.some(l => l.custo_unitario !== undefined);
  const finalizada = dados?.venda?.status === 'finalizada';

  return (
    <>
      <form className="card" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-end' }} onSubmit={buscar} noValidate>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="cv-venda">Número da venda</label>
          <input id="cv-venda" type="number" min="1" className="input-field" value={vendaId} onChange={e => setVendaId(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary">Buscar</button>
      </form>
      <Erro msg={erro} />
      {dados && (
        <>
          <p className="text-sm">Venda #{dados.venda.id} — {dados.venda.status} — {dataBR(dados.venda.data)}</p>
          {dados.linhas.length === 0 ? <p className="text-sm text-secondary">Esta venda não tem consumo de insumos.</p> : (
            <div className="card compras-table-wrap" style={{ marginBottom: 16 }}>
              <table className="compras-table">
                <thead>
                  <tr><th>Insumo</th><th>Origem</th><th>Previsto</th><th>Baixado</th><th>Pendente</th><th>Situação</th>{temCusto && <th>Custo un.</th>}<th /></tr>
                </thead>
                <tbody>
                  {dados.linhas.map(l => (
                    <tr key={l.id}>
                      <td>{l.sku ? `${l.sku} — ` : ''}{l.nome}</td>
                      <td>{ROTULO_MOTIVO[l.origem] ?? l.origem}{l.observacao ? ` (${l.observacao})` : ''}</td>
                      <td>{l.quantidade_prevista}</td>
                      <td>{l.quantidade_baixada}</td>
                      <td>{l.quantidade_pendente}</td>
                      <td>{ROTULO_ESTADO[l.estado] ?? l.estado}</td>
                      {temCusto && <td>{formatarCusto(l.custo_unitario) ?? '—'}</td>}
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {finalizada && podeRegularizar(l) && (
                          <button type="button" className="btn btn-secondary" disabled={ocupado}
                            onClick={() => acao(() => regularizarConsumoDaVenda(dados.venda.id, l.id), 'Pendência regularizada.')}>
                            Regularizar
                          </button>
                        )}{' '}
                        {finalizada && podeRetirar(l) && (
                          <button type="button" className="btn btn-secondary" disabled={ocupado}
                            onClick={() => acao(() => retirarConsumoDaVenda(dados.venda.id, l.id), 'Consumo retirado; estoque devolvido.')}>
                            Retirar
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {finalizada ? (
            <form className="card" style={{ padding: 16 }} onSubmit={acrescentar} noValidate>
              <h3>Acrescentar insumo</h3>
              <div className="modal-form-grid">
                <SelectInsumo id="cv-ins" insumos={insumos} value={form.produto_id} onChange={v => setForm(p => ({ ...p, produto_id: v }))} />
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cv-qtd">Quantidade</label>
                  <input id="cv-qtd" type="number" min="1" step="1" className="input-field" value={form.quantidade} onChange={e => setForm(p => ({ ...p, quantidade: e.target.value }))} />
                </div>
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cv-mot">Motivo</label>
                  <select id="cv-mot" className="input-field" value={form.motivo} onChange={e => setForm(p => ({ ...p, motivo: e.target.value }))}>
                    <option value="">Escolha o motivo</option>
                    {MOTIVOS_VENDA.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div className="input-wrapper">
                  <label className="input-label" htmlFor="cv-obs">Observação</label>
                  <input id="cv-obs" type="text" className="input-field" value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={ocupado}>Acrescentar</button>
            </form>
          ) : (
            <p className="text-sm text-secondary">Só vendas finalizadas aceitam ajustes de consumo.</p>
          )}
        </>
      )}
    </>
  );
}

function Substituicao({ insumos, recarregarInsumos }) {
  const toast = useToast();
  const [de, setDe] = useState('');
  const [para, setPara] = useState('');
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function ver(e) {
    e.preventDefault();
    if (!de) { setErro('Escolha o insumo a substituir'); return; }
    setErro('');
    setOcupado(true);
    try {
      setPrevia(await previaSubstituicao(de));
    } catch (err) {
      setPrevia(null);
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function confirmar() {
    if (!para) { setErro('Escolha o insumo substituto'); return; }
    if (para === de) { setErro('O substituto deve ser diferente do insumo atual'); return; }
    setErro('');
    setOcupado(true);
    try {
      const r = await substituirInsumo(Number(de), Number(para));
      toast.success(`Substituição aplicada em ${r?.afetados?.length ?? 0} ficha(s).`);
      setPrevia(null);
      recarregarInsumos();
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <p className="text-sm text-secondary">
        Troca um insumo por outro em todas as fichas de venda vigentes. Cada ficha afetada ganha uma nova versão; vendas antigas não mudam.
      </p>
      <Erro msg={erro} />
      <form className="card" style={{ padding: 16, marginBottom: 16 }} onSubmit={ver} noValidate>
        <SelectInsumo id="sub-de" label="Insumo a substituir" insumos={insumos} value={de} onChange={v => { setDe(v); setPrevia(null); }} />
        <button type="submit" className="btn btn-secondary" disabled={ocupado}>Ver fichas afetadas</button>
      </form>
      {previa && (
        <div className="card" style={{ padding: 16 }}>
          <h3>{previa.afetados.length} produto(s) afetado(s)</h3>
          {previa.afetados.length === 0 ? <p className="text-sm">Nenhuma ficha vigente usa este insumo.</p> : (
            <>
              <ul>
                {previa.afetados.map(a => <li key={a.ficha_venda_id}>{a.sku ? `${a.sku} — ` : ''}{a.nome} (qtd {a.quantidade})</li>)}
              </ul>
              <SelectInsumo id="sub-para" label="Substituir por" insumos={insumos.filter(i => String(i.id) !== de)} value={para} onChange={setPara} />
              <button type="button" className="btn btn-primary" disabled={ocupado || !para} onClick={confirmar}>
                Confirmar substituição
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

function Relatorio({ insumos }) {
  const [filtros, setFiltros] = useState({ de: '', ate: '', produto_id: '', motivo: '' });
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  async function gerar(e) {
    e?.preventDefault();
    setErro('');
    setCarregando(true);
    try {
      setDados(await relatorioConsumo(filtros));
    } catch (err) {
      setDados(null);
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  const temCusto = dados?.totais?.custo_total !== undefined;
  const set = (k, v) => setFiltros(p => ({ ...p, [k]: v }));

  return (
    <>
      <form className="card" style={{ padding: 16, marginBottom: 16 }} onSubmit={gerar} noValidate>
        <div className="modal-form-grid">
          <div className="input-wrapper">
            <label className="input-label" htmlFor="rel-de">De</label>
            <input id="rel-de" type="date" className="input-field" value={filtros.de} onChange={e => set('de', e.target.value)} />
          </div>
          <div className="input-wrapper">
            <label className="input-label" htmlFor="rel-ate">Até</label>
            <input id="rel-ate" type="date" className="input-field" value={filtros.ate} onChange={e => set('ate', e.target.value)} />
          </div>
          <SelectInsumo id="rel-ins" label="Insumo" insumos={insumos} value={filtros.produto_id} onChange={v => set('produto_id', v)} />
          <div className="input-wrapper">
            <label className="input-label" htmlFor="rel-mot">Motivo</label>
            <select id="rel-mot" className="input-field" value={filtros.motivo} onChange={e => set('motivo', e.target.value)}>
              <option value="">Todos</option>
              {Object.entries(ROTULO_MOTIVO).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={carregando}>{carregando ? 'Gerando…' : 'Gerar relatório'}</button>
      </form>
      <Erro msg={erro} />
      {dados && (
        <>
          <div className="card" style={{ padding: 16, marginBottom: 16 }}>
            <h3>Totais por motivo</h3>
            {dados.totais.por_motivo.length === 0 ? <p className="text-sm">Sem consumo no período.</p> : (
              <ul>
                {dados.totais.por_motivo.map(t => (
                  <li key={t.motivo}>
                    {ROTULO_MOTIVO[t.motivo] ?? t.motivo}: {t.quantidade} un.
                    {t.custo_total !== undefined && ` — ${formatarCusto(t.custo_total)}`}
                  </li>
                ))}
              </ul>
            )}
            {temCusto && <p><strong>Custo total: {formatarCusto(dados.totais.custo_total)}</strong></p>}
          </div>
          {dados.itens.length > 0 && (
            <div className="card compras-table-wrap">
              <table className="compras-table">
                <thead><tr><th>Insumo</th><th>Motivo</th><th>Qtd</th>{temCusto && <th>Custo</th>}</tr></thead>
                <tbody>
                  {dados.itens.map(i => (
                    <tr key={`${i.produto_id}-${i.motivo}`}>
                      <td>{i.sku ? `${i.sku} — ` : ''}{i.nome}</td>
                      <td>{ROTULO_MOTIVO[i.motivo] ?? i.motivo}</td>
                      <td>{i.quantidade}</td>
                      {temCusto && <td>{formatarCusto(i.custo_total) ?? '—'}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function Consumo() {
  useAuth();
  const [aba, setAba] = useState('avulso');
  const [insumos, setInsumos] = useState([]);
  const [erro, setErro] = useState('');

  const recarregarInsumos = useCallback(() => {
    listarInsumos()
      .then(l => setInsumos(Array.isArray(l) ? l : []))
      .catch(err => setErro(err.message));
  }, []);

  useEffect(() => { recarregarInsumos(); }, [recarregarInsumos]);

  const conteudo = useMemo(() => {
    const props = { insumos, recarregarInsumos };
    if (aba === 'venda') return <PorVenda {...props} />;
    if (aba === 'substituicao') return <Substituicao {...props} />;
    if (aba === 'relatorio') return <Relatorio insumos={insumos} />;
    return <Avulso {...props} />;
  }, [aba, insumos, recarregarInsumos]);

  return (
    <div className="page-content">
      <div className="page-header">
        <h1 className="page-title">Consumo de insumos</h1>
      </div>
      <Erro msg={erro} />
      <div className="compras-tabs">
        {ABAS.map(t => (
          <button
            key={t.key}
            type="button"
            className={`compras-tab ${aba === t.key ? 'compras-tab--active' : ''}`}
            onClick={() => setAba(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {conteudo}
    </div>
  );
}
