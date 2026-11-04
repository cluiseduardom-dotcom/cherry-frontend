import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Ban, Check, Undo2, ChevronLeft, ChevronRight, Landmark, Power, Upload, RefreshCw, Lightbulb } from 'lucide-react';
import {
  alterarStatusContaBancaria, conciliarMovimentoBancario, desfazerConciliacaoBancaria,
  listarContasBancarias, listarMovimentosBancarios, sincronizarMercadoPago,
} from '../services/bancos';
import {
  filtrosParaConsulta, hojeBrasilia, podeCancelar, rotuloOrigem, rotuloTipoConta, situacaoMovimento, textoResultadoMercadoPago,
  totaisDasContas,
} from '../utils/bancos';
import ContaBancariaModal from '../components/bancos/ContaBancariaModal';
import MovimentoBancarioModal from '../components/bancos/MovimentoBancarioModal';
import CancelarMovimentoModal from '../components/bancos/CancelarMovimentoModal';
import ImportarExtratoModal from '../components/bancos/ImportarExtratoModal';
import SugestoesModal from '../components/bancos/SugestoesModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { useToast } from '../context/ToastContext';
import { formatarMoeda } from '../utils/mascaras';
import { formatarData } from '../utils/formatarData';
import './Contas.css';
import './Bancos.css';

const POR_PAGINA = 50;
const FILTROS_VAZIOS = { conta: '', tipo: '', conciliado: '', inicio: '', fim: '', cancelados: false };

export default function Bancos() {
  const toast = useToast();
  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();

  const [contas, setContas] = useState([]);
  const [erroContas, setErroContas] = useState('');
  const [carregandoContas, setCarregandoContas] = useState(true);

  const [filtros, setFiltros] = useState(FILTROS_VAZIOS);
  const [pagina, setPagina] = useState(1);
  const [movs, setMovs] = useState({ items: [], total: 0 });
  const [carregandoMovs, setCarregandoMovs] = useState(true);
  const [erroMovs, setErroMovs] = useState('');
  const [trabalhandoId, setTrabalhandoId] = useState(null);

  const [modalConta, setModalConta] = useState({ aberto: false, conta: null });
  const [modalMov, setModalMov] = useState(false);
  const [cancelando, setCancelando] = useState(null);
  const [importando, setImportando] = useState(false);
  const [sugerindo, setSugerindo] = useState(null);

  const carregarContas = useCallback(async () => {
    try {
      setContas(await listarContasBancarias());
      setErroContas('');
    } catch (err) {
      setErroContas(err.message);
    } finally {
      setCarregandoContas(false);
    }
  }, []);

  const carregarMovs = useCallback(async () => {
    setCarregandoMovs(true);
    try {
      setMovs(await listarMovimentosBancarios(filtrosParaConsulta({ ...filtros, pagina, porPagina: POR_PAGINA })));
      setErroMovs('');
    } catch (err) {
      setErroMovs(err.message);
    } finally {
      setCarregandoMovs(false);
    }
  }, [filtros, pagina]);

  useEffect(() => { carregarContas(); }, [carregarContas]);
  useEffect(() => { carregarMovs(); }, [carregarMovs]);

  const totais = useMemo(() => totaisDasContas(contas), [contas]);
  const totalPaginas = Math.max(1, Math.ceil(movs.total / POR_PAGINA));
  const hoje = hojeBrasilia();

  function mudarFiltro(campo, valor) {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setPagina(1);
  }

  async function sincronizarMp(c) {
    setTrabalhandoId(`conta-${c.id}`);
    try {
      const r = await sincronizarMercadoPago(c.id);
      const texto = textoResultadoMercadoPago(r);
      if (r.erros.length) toast.error(`${texto} Primeiro erro: ${r.erros[0].erro}`); else toast.success(texto);
      recarregarTudo();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTrabalhandoId(null);
    }
  }

  function recarregarTudo() { carregarContas(); carregarMovs(); }

  async function executar(id, acao, mensagem) {
    setTrabalhandoId(id);
    try {
      await acao();
      toast.success(mensagem);
      recarregarTudo();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setTrabalhandoId(null);
    }
  }

  function conferir(m) {
    executar(m.id, () => conciliarMovimentoBancario(m.id), 'Movimento marcado como conferido.');
  }

  function desfazer(m) {
    pedirConfirmacao({
      title: 'Desfazer conferência',
      message: `Voltar "${m.descricao}" para "A conferir"?`,
      confirmLabel: 'Desfazer',
      tone: 'warning',
      execute: () => executar(m.id, () => desfazerConciliacaoBancaria(m.conciliacao_id), 'Conferência desfeita.'),
    });
  }

  function alternarConta(c) {
    const inativando = c.status === 'ATIVA';
    pedirConfirmacao({
      title: inativando ? 'Inativar conta' : 'Reativar conta',
      message: inativando
        ? `Inativar "${c.nome}"? Ela deixa de aceitar lançamentos e sai do total. O histórico é mantido.`
        : `Reativar "${c.nome}"?`,
      confirmLabel: inativando ? 'Inativar' : 'Reativar',
      tone: inativando ? 'danger' : 'warning',
      execute: () => executar(`conta-${c.id}`, () => alterarStatusContaBancaria(c.id, inativando ? 'INATIVA' : 'ATIVA'),
        inativando ? 'Conta inativada.' : 'Conta reativada.'),
    });
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bancos</h1>
          <p className="page-subtitle">Saldo total das contas ativas: {formatarMoeda(totais.saldo)}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={() => setModalConta({ aberto: true, conta: null })}>
            <Plus size={16} /> Nova conta
          </button>
          <button className="btn btn-ghost" onClick={() => setImportando(true)} disabled={totais.ativas === 0}>
            <Upload size={16} /> Importar extrato
          </button>
          <button className="btn btn-primary" onClick={() => setModalMov(true)} disabled={totais.ativas === 0}>
            <Plus size={16} /> Lançamento
          </button>
        </div>
      </div>

      <p className="bancos-aviso">
        Os saldos são calculados pelos movimentos registrados no Vertumno a partir do saldo inicial de cada conta.
        Não são o saldo oficial do banco — confira com o extrato.
      </p>

      {carregandoContas && <div className="empty-state"><p className="text-sm text-secondary">Carregando contas...</p></div>}
      {!carregandoContas && erroContas && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar as contas</div>
          <p className="text-sm text-secondary">{erroContas}</p>
        </div>
      )}
      {!carregandoContas && !erroContas && contas.length === 0 && (
        <div className="empty-state">
          <Landmark size={32} />
          <div className="empty-state-title">Nenhuma conta cadastrada</div>
          <p className="text-sm text-secondary">Cadastre a primeira conta (banco, caixa ou conta de pagamento) para acompanhar o saldo.</p>
        </div>
      )}

      {contas.length > 0 && (
        <div className="bancos-contas">
          {contas.map(c => {
            const saldo = Number(c.saldo_atual || 0);
            const aLiberar = Number(c.a_liberar || 0);
            const ocupado = trabalhandoId === `conta-${c.id}`;
            return (
              <div
                key={c.id}
                className={`card card-padding bancos-conta ${String(filtros.conta) === String(c.id) ? 'bancos-conta--ativo' : ''}`}
                style={c.status !== 'ATIVA' ? { opacity: 0.6 } : undefined}
              >
                <div className="bancos-conta-topo">
                  <span className="bancos-conta-nome">{c.nome}</span>
                  <span>
                    {c.principal && <span className="badge badge-primary">Principal</span>}{' '}
                    {c.status !== 'ATIVA' && <span className="badge badge-danger">Inativa</span>}
                  </span>
                </div>
                <div className="bancos-conta-sub">
                  {rotuloTipoConta(c.tipo)}{c.instituicao_nome ? ` · ${c.instituicao_nome}` : ''}
                  {c.origem && c.origem !== 'MANUAL' ? ' · integrada' : ''}
                </div>
                <div className={`bancos-conta-saldo ${saldo < 0 ? 'bancos-conta-saldo--neg' : ''}`}>{formatarMoeda(saldo)}</div>
                {aLiberar !== 0 && <div className="bancos-conta-sub">A liberar: {formatarMoeda(aLiberar)}</div>}
                <div className="bancos-conta-acoes">
                  <button className="btn btn-ghost btn-sm" onClick={() => mudarFiltro('conta', String(filtros.conta) === String(c.id) ? '' : String(c.id))}>
                    {String(filtros.conta) === String(c.id) ? 'Ver todas' : 'Ver movimentos'}
                  </button>
                  {c.tipo === 'CONTA_PAGAMENTO' && c.status === 'ATIVA' && (
                    <button className="btn btn-ghost btn-sm" disabled={ocupado} onClick={() => sincronizarMp(c)} title="Traz os pagamentos e devoluções do Mercado Pago feitos pelo Vertumno">
                      <RefreshCw size={14} /> {ocupado ? 'Sincronizando...' : 'Sincronizar Mercado Pago'}
                    </button>
                  )}
                  <button className="contas-action-btn" aria-label={`Editar ${c.nome}`} title="Editar" onClick={() => setModalConta({ aberto: true, conta: c })}>
                    <Edit size={14} />
                  </button>
                  <button className="contas-action-btn" aria-label={c.status === 'ATIVA' ? `Inativar ${c.nome}` : `Reativar ${c.nome}`} title={c.status === 'ATIVA' ? 'Inativar' : 'Reativar'} disabled={ocupado} onClick={() => alternarConta(c)}>
                    <Power size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bancos-filtros">
        <div className="input-wrapper">
          <label className="input-label" htmlFor="bf-conta">Conta</label>
          <select id="bf-conta" className="input-field" value={filtros.conta} onChange={e => mudarFiltro('conta', e.target.value)}>
            <option value="">Todas</option>
            {contas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="bf-tipo">Tipo</label>
          <select id="bf-tipo" className="input-field" value={filtros.tipo} onChange={e => mudarFiltro('tipo', e.target.value)}>
            <option value="">Todos</option>
            <option value="ENTRADA">Entradas</option>
            <option value="SAIDA">Saídas</option>
          </select>
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="bf-conf">Conferência</label>
          <select
            id="bf-conf" className="input-field"
            value={filtros.conciliado === '' ? '' : String(filtros.conciliado)}
            onChange={e => mudarFiltro('conciliado', e.target.value === '' ? '' : e.target.value === 'true')}
          >
            <option value="">Todos</option>
            <option value="false">A conferir</option>
            <option value="true">Conferidos</option>
          </select>
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="bf-ini">De</label>
          <input id="bf-ini" type="date" className="input-field" value={filtros.inicio} onChange={e => mudarFiltro('inicio', e.target.value)} />
        </div>
        <div className="input-wrapper">
          <label className="input-label" htmlFor="bf-fim">Até</label>
          <input id="bf-fim" type="date" className="input-field" value={filtros.fim} onChange={e => mudarFiltro('fim', e.target.value)} />
        </div>
        <label style={{ display: 'flex', gap: 6, alignItems: 'center', paddingBottom: 8 }}>
          <input type="checkbox" checked={filtros.cancelados} onChange={e => mudarFiltro('cancelados', e.target.checked)} />
          Mostrar cancelados
        </label>
      </div>

      {carregandoMovs && <div className="empty-state"><p className="text-sm text-secondary">Carregando movimentos...</p></div>}
      {!carregandoMovs && erroMovs && (
        <div className="empty-state">
          <div className="empty-state-title">Não foi possível carregar os movimentos</div>
          <p className="text-sm text-secondary">{erroMovs}</p>
        </div>
      )}
      {!carregandoMovs && !erroMovs && movs.items.length === 0 && (
        <div className="empty-state"><p className="text-sm text-secondary">Nenhum movimento encontrado com esses filtros.</p></div>
      )}

      {!carregandoMovs && !erroMovs && movs.items.length > 0 && (
        <div className="card">
          <div className="table-scroll">
            <table className="contas-table">
              <thead>
                <tr>
                  <th>Data</th><th>Conta</th><th>Descrição</th><th>Origem</th><th>Valor</th><th>Situação</th><th></th>
                </tr>
              </thead>
              <tbody>
                {movs.items.map(m => {
                  const sit = situacaoMovimento(m);
                  const dia = String(m.data_movimento).slice(0, 10);
                  const futuro = dia > hoje;
                  const ocupado = trabalhandoId === m.id;
                  return (
                    <tr key={m.id} className={`contas-row ${m.cancelado_em ? 'bancos-cancelado' : ''}`}>
                      <td className="contas-date">
                        {formatarData(m.data_movimento)}
                        {futuro && <div className="bancos-futuro">a liberar</div>}
                      </td>
                      <td>{m.conta_nome ?? '—'}</td>
                      <td className="contas-descricao bancos-desc">
                        {m.descricao}
                        {m.motivo_cancelamento && <div className="bancos-futuro">Motivo: {m.motivo_cancelamento}</div>}
                      </td>
                      <td>{rotuloOrigem(m.origem)}</td>
                      <td className={m.tipo === 'ENTRADA' ? 'bancos-entrada' : 'bancos-saida'}>
                        {m.tipo === 'ENTRADA' ? '+' : '−'} {formatarMoeda(m.valor)}
                      </td>
                      <td><span className={`badge ${sit.classe}`}>{sit.rotulo}</span></td>
                      <td>
                        {!m.cancelado_em && (
                          <div className="contas-actions">
                            {!m.conciliado && (
                              <button className="contas-action-btn contas-action-btn--success" aria-label="Marcar como conferido" title="Marcar como conferido" disabled={ocupado} onClick={() => conferir(m)}>
                                <Check size={14} />
                              </button>
                            )}
                            {m.conciliado && m.conciliacao_id && (
                              <button className="contas-action-btn" aria-label="Desfazer conferência" title="Desfazer conferência" disabled={ocupado} onClick={() => desfazer(m)}>
                                <Undo2 size={14} />
                              </button>
                            )}
                            <button className="contas-action-btn" aria-label="Ver sugestões de contas" title="Ver contas a pagar/receber parecidas" onClick={() => setSugerindo(m)}>
                              <Lightbulb size={14} />
                            </button>
                            {podeCancelar(m) && (
                              <button className="contas-action-btn contas-action-btn--danger" aria-label="Cancelar movimento" title="Cancelar movimento" disabled={ocupado} onClick={() => setCancelando(m)}>
                                <Ban size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="contas-pagination">
            <span className="text-sm text-secondary">{movs.total} movimentos · página {pagina} de {totalPaginas}</span>
            <div className="contas-pagination-actions">
              <button className="btn btn-ghost btn-sm" disabled={pagina <= 1} onClick={() => setPagina(p => p - 1)} aria-label="Página anterior"><ChevronLeft size={14} /></button>
              <button className="btn btn-ghost btn-sm" disabled={pagina >= totalPaginas} onClick={() => setPagina(p => p + 1)} aria-label="Próxima página"><ChevronRight size={14} /></button>
            </div>
          </div>
        </div>
      )}

      <ContaBancariaModal
        open={modalConta.aberto}
        conta={modalConta.conta}
        onClose={() => setModalConta({ aberto: false, conta: null })}
        onSaved={(_c, criada) => {
          setModalConta({ aberto: false, conta: null });
          toast.success(criada ? 'Conta criada.' : 'Conta atualizada.');
          carregarContas();
        }}
      />
      <MovimentoBancarioModal
        open={modalMov}
        contas={contas}
        contaInicialId={filtros.conta}
        onClose={() => setModalMov(false)}
        onSaved={() => { setModalMov(false); toast.success('Movimento lançado.'); recarregarTudo(); }}
      />
      <CancelarMovimentoModal
        open={Boolean(cancelando)}
        movimento={cancelando}
        onClose={() => setCancelando(null)}
        onCancelado={() => { setCancelando(null); toast.success('Movimento cancelado.'); recarregarTudo(); }}
      />
      <ImportarExtratoModal
        open={importando}
        contas={contas}
        contaInicialId={filtros.conta}
        onClose={() => setImportando(false)}
        onImportado={r => {
          setImportando(false);
          toast.success(`${r.importadas} lançamento(s) importado(s).`);
          recarregarTudo();
        }}
      />
      <SugestoesModal open={Boolean(sugerindo)} movimento={sugerindo} onClose={() => setSugerindo(null)} />
      <ConfirmDialog
        open={Boolean(acaoPendente)}
        title={acaoPendente?.title}
        message={acaoPendente?.message}
        confirmLabel={acaoPendente?.confirmLabel}
        tone={acaoPendente?.tone}
        onConfirm={confirmar}
        onCancel={cancelar}
      />
    </div>
  );
}
