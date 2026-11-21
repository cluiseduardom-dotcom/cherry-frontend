import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Ban, PackageCheck, Pencil, Send, ThumbsUp } from 'lucide-react';
import { buscarPedidoCompra, enviarPedidoCompra, confirmarPedidoCompra, cancelarPedidoCompra } from '../services/pedidosCompra';
import { listarFornecedores } from '../services/fornecedores';
import { listarTodosProdutos } from '../services/produtos';
import PedidoCompraModal from '../components/compras/PedidoCompraModal';
import ReceberPedidoModal from '../components/compras/ReceberPedidoModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { useToast } from '../context/ToastContext';
import { acoesDoPedido, rotuloStatusPedido, badgeStatusPedido } from '../utils/pedidoCompra';
import { formatarData } from '../utils/formatarData';
import { formatarMoeda as money } from '../utils/mascaras';
import './Compras.css';
import './CompraDetalhe.css';

export default function PedidoCompraDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();
  const [pedido, setPedido] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [editando, setEditando] = useState(false);
  const [recebendo, setRecebendo] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      setPedido(await buscarPedidoCompra(id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  // Fornecedores e produtos só são necessários para editar: carrega na primeira vez que o formulário abre.
  async function abrirEdicao() {
    try {
      if (!fornecedores.length) {
        const [forn, prod] = await Promise.all([listarFornecedores({ pageSize: 100 }), listarTodosProdutos({ canal: 'loja_fisica' })]);
        setFornecedores(forn.items || []);
        setProdutos(prod.items || []);
      }
      setEditando(true);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function executar(acao, mensagem) {
    setOcupado(true);
    try {
      await acao(id);
      toast.success(mensagem);
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setOcupado(false);
    }
  }

  const enviar = () => pedirConfirmacao({
    title: 'Enviar pedido',
    message: 'Marcar o pedido como enviado ao fornecedor? Depois disso ele não pode mais ser editado.',
    confirmLabel: 'Enviar',
    tone: 'warning',
    execute: () => executar(enviarPedidoCompra, 'Pedido marcado como enviado.'),
  });
  const confirmarFornecedor = () => pedirConfirmacao({
    title: 'Fornecedor confirmou',
    message: 'Registrar que o fornecedor confirmou o pedido?',
    confirmLabel: 'Registrar',
    tone: 'warning',
    execute: () => executar(confirmarPedidoCompra, 'Confirmação registrada.'),
  });
  const cancelarPedido = () => pedirConfirmacao({
    title: 'Cancelar pedido',
    message: 'Cancelar este pedido de compra? Não é possível desfazer.',
    confirmLabel: 'Cancelar pedido',
    tone: 'danger',
    execute: () => executar(cancelarPedidoCompra, 'Pedido cancelado.'),
  });

  if (loading) return <div className="page-content"><div className="empty-state"><p className="text-sm text-secondary">Carregando pedido...</p></div></div>;
  if (error) return <div className="page-content"><button className="compra-detalhe-voltar" onClick={() => navigate('/compras/pedidos')}><ArrowLeft size={16} /> Voltar</button><div className="compra-alert error">{error}</div></div>;
  if (!pedido) return null;

  const acoes = acoesDoPedido(pedido.status);
  const temSaldo = (pedido.itens || []).some((i) => Number(i.saldo) > 0);

  return (
    <div className="page-content">
      <button className="compra-detalhe-voltar" onClick={() => navigate('/compras/pedidos')}><ArrowLeft size={16} /> Voltar para Pedidos de compra</button>

      <div className="page-header">
        <div>
          <h1 className="page-title">Pedido {pedido.numero}</h1>
          <p className="page-subtitle">
            {pedido.fornecedor_nome}
            {pedido.data_emissao ? ` · emitido em ${formatarData(pedido.data_emissao)}` : ''}
            {pedido.data_prevista_entrega ? ` · entrega prevista ${formatarData(pedido.data_prevista_entrega)}` : ''}
          </p>
        </div>
        <span className={badgeStatusPedido(pedido.status)}>{rotuloStatusPedido(pedido.status)}</span>
      </div>

      <div className="card compras-table-wrap">
        <table className="compras-table">
          <thead><tr><th>Produto</th><th className="numeric">Pedido</th><th className="numeric">Recebido</th><th className="numeric">Falta</th><th className="numeric">Preço unit.</th><th className="numeric">Desconto</th></tr></thead>
          <tbody>
            {(pedido.itens || []).map((i) => (
              <tr key={i.id}>
                <td>{i.descricao_snapshot}</td>
                <td className="numeric">{i.quantidade}</td>
                <td className="numeric">{i.quantidade_recebida}</td>
                <td className="numeric">{i.saldo}</td>
                <td className="numeric">{money(i.preco_unitario)}</td>
                <td className="numeric">{i.desconto ? money(i.desconto) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card card-padding" style={{ marginTop: 12 }}>
        <div className="compra-detalhe-summary">
          {Number(pedido.frete_valor) > 0 && <div>Frete: {money(pedido.frete_valor)}</div>}
          {Number(pedido.desconto) > 0 && <div>Desconto: {money(pedido.desconto)}</div>}
          {Number(pedido.outras_despesas) > 0 && <div>Outras despesas: {money(pedido.outras_despesas)}</div>}
          {pedido.prazo_pagamento_dias !== null && pedido.prazo_pagamento_dias !== undefined && <div>Pagamento em {pedido.prazo_pagamento_dias} dias após o recebimento</div>}
          {pedido.observacoes && <div>Obs.: {pedido.observacoes}</div>}
          <strong>Total: {money(pedido.total)}</strong>
        </div>
      </div>

      <div className="card card-padding compra-recebimento-acoes-card" style={{ marginTop: 12 }}>
        {acoes.editar && <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={abrirEdicao}><Pencil size={16} /> Editar</button>}
        {acoes.enviar && <button type="button" className="btn btn-primary" disabled={ocupado} onClick={enviar}><Send size={16} /> Enviar ao fornecedor</button>}
        {acoes.confirmar && <button type="button" className="btn btn-secondary" disabled={ocupado} onClick={confirmarFornecedor}><ThumbsUp size={16} /> Fornecedor confirmou</button>}
        {acoes.receber && temSaldo && <button type="button" className="btn btn-primary" disabled={ocupado} onClick={() => setRecebendo(true)}><PackageCheck size={16} /> Receber</button>}
        {acoes.cancelar && <button type="button" className="btn btn-ghost" disabled={ocupado} onClick={cancelarPedido}><Ban size={16} /> Cancelar pedido</button>}
      </div>

      {editando && (
        <PedidoCompraModal
          pedido={pedido}
          fornecedores={fornecedores}
          produtos={produtos}
          onClose={() => setEditando(false)}
          onSalvo={() => { setEditando(false); toast.success('Pedido atualizado.'); load(); }}
        />
      )}

      {recebendo && (
        <ReceberPedidoModal
          pedido={pedido}
          onClose={() => setRecebendo(false)}
          onPreparado={(recebimento) => { toast.success('Recebimento preparado. Confira e aprove para lançar o estoque.'); navigate(`/compras/recebimentos/${recebimento.id}`); }}
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
