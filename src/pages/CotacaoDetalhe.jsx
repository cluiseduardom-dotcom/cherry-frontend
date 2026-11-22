import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, FilePlus2, ThumbsDown } from 'lucide-react';
import { buscarCotacao, cancelarCotacao, gerarPedidos, recusarFornecedor } from '../services/cotacoes';
import PropostaModal from '../components/compras/PropostaModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { useToast } from '../context/ToastContext';
import {
  acoesDaCotacao, badgeStatusCotacao, badgeStatusFornecedor, escolhaInicial, montarEscolhas, ofertaDe, resumoPorFornecedor,
  rotuloStatusCotacao, rotuloStatusFornecedor,
} from '../utils/cotacao';
import { formatarData } from '../utils/formatarData';
import { formatarMoeda as money } from '../utils/mascaras';
import './Compras.css';
import './CompraDetalhe.css';
import './Cotacoes.css';

export default function CotacaoDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();
  const [cotacao, setCotacao] = useState(null);
  const [escolha, setEscolha] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [propostaDe, setPropostaDe] = useState(null);
  const [pedidosGerados, setPedidosGerados] = useState(null);

  function aplicar(dados) {
    setCotacao(dados);
    setEscolha(escolhaInicial(dados));
  }

  async function load() {
    setLoading(true);
    setError('');
    try {
      aplicar(await buscarCotacao(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  const resumo = useMemo(() => (cotacao ? resumoPorFornecedor(cotacao, escolha) : []), [cotacao, escolha]);

  async function executar(acao, mensagem) {
    setOcupado(true);
    try {
      const resultado = await acao();
      toast.success(mensagem);
      return resultado;
    } catch (err) {
      toast.error(err.message);
      return null;
    } finally {
      setOcupado(false);
    }
  }

  const recusar = fornecedor => pedirConfirmacao({
    title: 'Fornecedor recusou',
    message: `Registrar que ${fornecedor.fornecedor_nome} recusou? A proposta dele, se houver, é apagada.`,
    confirmLabel: 'Registrar',
    tone: 'warning',
    execute: async () => { const dados = await executar(() => recusarFornecedor(cotacao.id, fornecedor.fornecedor_id), 'Recusa registrada.'); if (dados) aplicar(dados); },
  });

  const cancelarCot = () => pedirConfirmacao({
    title: 'Cancelar cotação',
    message: 'Cancelar esta cotação? Não é possível desfazer.',
    confirmLabel: 'Cancelar cotação',
    tone: 'danger',
    execute: async () => { const dados = await executar(() => cancelarCotacao(cotacao.id), 'Cotação cancelada.'); if (dados) aplicar(dados); },
  });

  const gerar = () => pedirConfirmacao({
    title: 'Gerar pedidos de compra',
    message: `Será criado um pedido de compra (rascunho) para ${resumo.length === 1 ? 'o fornecedor escolhido' : `cada um dos ${resumo.length} fornecedores escolhidos`} e a cotação será encerrada. Itens sem escolha não serão pedidos.`,
    confirmLabel: 'Gerar pedidos',
    tone: 'warning',
    execute: async () => {
      const resultado = await executar(() => gerarPedidos(cotacao.id, montarEscolhas(cotacao, escolha)), 'Pedidos gerados.');
      if (resultado) { aplicar(resultado.cotacao); setPedidosGerados(resultado.pedidos); }
    },
  });

  if (loading) return <div className="page-content"><div className="empty-state"><p className="text-sm text-secondary">Carregando cotação...</p></div></div>;
  if (error) return <div className="page-content"><button className="compra-detalhe-voltar" onClick={() => navigate('/compras/cotacoes')}><ArrowLeft size={16} /> Voltar</button><div className="compra-alert error">{error}</div></div>;
  if (!cotacao) return null;

  const acoes = acoesDaCotacao(cotacao);
  const nomeDo = fornecedorId => cotacao.fornecedores.find(f => f.fornecedor_id === fornecedorId)?.fornecedor_nome;

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate('/compras/cotacoes')}><ArrowLeft size={16} /> Voltar para Cotações</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Cotação {cotacao.numero}</h1>
          <p className="page-subtitle">
            {cotacao.data_abertura ? `Aberta em ${formatarData(cotacao.data_abertura)}` : ''}
            {cotacao.data_limite ? ` · responder até ${formatarData(cotacao.data_limite)}` : ''}
            {cotacao.observacoes ? ` · ${cotacao.observacoes}` : ''}
          </p>
        </div>
        <span className={badgeStatusCotacao(cotacao.status)}>{rotuloStatusCotacao(cotacao.status)}</span>
      </div>

      {pedidosGerados && (
        <div className="compra-alert success">
          Pedidos gerados como rascunho:{' '}
          {pedidosGerados.map((p, i) => (
            <span key={p.id}>{i > 0 ? ', ' : ''}<Link to={`/compras/pedidos/${p.id}`}>{p.numero}</Link> ({nomeDo(p.fornecedor_id)}, {money(p.total)})</span>
          ))}
          . Abra cada um para revisar e enviar ao fornecedor.
        </div>
      )}

      <div className="card compras-table-wrap">
        <table className="cotacao-matriz">
          <thead>
            <tr>
              <th>Item</th>
              {cotacao.fornecedores.map(f => (
                <th key={f.id}>
                  <div className="cotacao-forn-cab">
                    <strong>{f.fornecedor_nome}</strong>
                    <span className={badgeStatusFornecedor(f.status)}>{rotuloStatusFornecedor(f.status)}</span>
                    {acoes.registrarProposta && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={() => setPropostaDe(f)}>{f.status === 'RESPONDIDA' ? 'Editar proposta' : 'Registrar proposta'}</button>
                        {f.status !== 'RECUSADA' && <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={() => recusar(f)} title="O fornecedor não vai cotar"><ThumbsDown size={12} /> Recusou</button>}
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cotacao.itens.map(item => (
              <tr key={item.id}>
                <td><strong>{item.produto_nome || item.descricao_snapshot}</strong><br /><small>pedir {item.quantidade_solicitada}</small></td>
                {cotacao.fornecedores.map(f => {
                  const oferta = ofertaDe(cotacao, item.id, f.fornecedor_id);
                  if (!oferta) return <td key={f.id}><div className="cotacao-celula cotacao-celula--vazia">{f.status === 'RECUSADA' ? 'Recusou' : '—'}</div></td>;
                  const melhor = item.melhor_fornecedor_id === f.fornecedor_id;
                  return (
                    <td key={f.id}>
                      <div className={`cotacao-celula${melhor ? ' cotacao-celula--melhor' : ''}`}>
                        {acoes.gerarPedidos ? (
                          <label>
                            <input type="radio" name={`item-${item.id}`} checked={escolha[item.id] === f.fornecedor_id} onChange={() => setEscolha(prev => ({ ...prev, [item.id]: f.fornecedor_id }))} />
                            {money(oferta.total)}
                          </label>
                        ) : <strong>{money(oferta.total)}</strong>}
                        <small>{oferta.quantidade_ofertada} × {money(oferta.preco_unitario)}{oferta.desconto > 0 ? ` − ${money(oferta.desconto)}` : ''}</small>
                        {oferta.prazo_entrega_dias != null && <small>entrega em {oferta.prazo_entrega_dias} dias</small>}
                        {oferta.condicao_pagamento && <small>{oferta.condicao_pagamento}</small>}
                        {melhor && <span className="cotacao-selo-melhor">Melhor preço</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {acoes.gerarPedidos && (
        <div className="card card-padding" style={{ marginTop: 12 }}>
          <strong>O que será pedido</strong>
          <p className="text-sm text-secondary" style={{ margin: '4px 0 0' }}>
            Já deixei marcado o melhor preço de cada item; troque se preferir outro fornecedor. Itens sem marca não entram nos pedidos.
          </p>
          {resumo.length === 0 ? (
            <p className="text-sm" style={{ marginTop: 10 }}>Nenhum item escolhido ainda. Registre as propostas e marque o fornecedor de cada item.</p>
          ) : (
            <div className="cotacao-resumo">
              {resumo.map(r => <div key={r.fornecedor_id} className="cotacao-resumo-item"><strong>{r.nome}</strong><br />{r.itens} item(ns) · {money(r.total)}</div>)}
            </div>
          )}
        </div>
      )}

      <div className="card card-padding compra-recebimento-acoes-card" style={{ marginTop: 12 }}>
        {acoes.gerarPedidos && <button type="button" className="btn btn-primary" disabled={ocupado || resumo.length === 0} onClick={gerar}><FilePlus2 size={16} /> Gerar pedido(s) de compra</button>}
        {acoes.cancelar && <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={cancelarCot}><Ban size={16} /> Cancelar cotação</button>}
      </div>

      {propostaDe && (
        <PropostaModal
          cotacao={cotacao}
          fornecedor={propostaDe}
          onClose={() => setPropostaDe(null)}
          onSalva={dados => { setPropostaDe(null); toast.success('Proposta registrada.'); aplicar(dados); }}
        />
      )}

      <ConfirmDialog
        open={acaoPendente !== null}
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
