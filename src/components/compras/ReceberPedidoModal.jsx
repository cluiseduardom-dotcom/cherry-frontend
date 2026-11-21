import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { prepararRecebimentoDoPedido } from '../../services/pedidosCompra';
import { itensARecever, montarItensRecebimento } from '../../utils/pedidoCompra';
import '../../pages/Compras.css';

const hoje = () => new Date().toLocaleDateString('en-CA');

// Receber o pedido (todo ou em parte): prepara o recebimento já conferido e leva para a tela dele,
// onde a aprovação lança a entrada de estoque e a conta a pagar.
export default function ReceberPedidoModal({ pedido, onClose, onPreparado }) {
  const itens = useMemo(() => itensARecever(pedido), [pedido]);
  const [quantidades, setQuantidades] = useState({});
  const [numero, setNumero] = useState('');
  const [data, setData] = useState(hoje());
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function preparar(e) {
    e.preventDefault();
    if (!numero.trim()) { setErro('Informe o número da nota ou do romaneio para identificar o recebimento.'); return; }
    const montado = montarItensRecebimento(itens, quantidades);
    if (montado.erro) { setErro(montado.erro); return; }
    setSalvando(true);
    setErro('');
    try {
      const recebimento = await prepararRecebimentoDoPedido(pedido, { numero: numero.trim(), data_recebimento: data }, montado.itens);
      onPreparado(recebimento);
    } catch (err) {
      setErro(err.message);
      setSalvando(false);
    }
  }

  return (
    <div className="compra-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !salvando && onClose()}>
      <form className="compra-modal" onSubmit={preparar}>
        <div className="compra-modal-header">
          <h2>Receber pedido {pedido.numero}</h2>
          <button type="button" className="produto-action-btn" onClick={onClose} aria-label="Fechar"><X size={16} /></button>
        </div>
        <p className="text-sm text-secondary" style={{ marginTop: -8, marginBottom: 14 }}>
          Informe o que chegou. Depois você confere e aprova o recebimento: é nessa hora que o estoque e a conta a pagar são lançados.
        </p>

        {erro && <div className="compra-alert error">{erro}</div>}

        <div className="compra-form-grid">
          <div className="compra-field">
            <label>Nota ou romaneio *</label>
            <input className="input-field" maxLength={60} placeholder="Ex.: NF 1234" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
          <div className="compra-field">
            <label>Data do recebimento *</label>
            <input type="date" className="input-field" value={data} onChange={(e) => setData(e.target.value)} />
          </div>
        </div>

        <div className="compra-items">
          {itens.map((item) => (
            <div className="compra-item-row compra-item-row--receber" key={item.id}>
              <div className="compra-field compra-item-product">
                <label>Produto</label>
                <div className="input-field">{item.descricao_snapshot}</div>
              </div>
              <div className="compra-field">
                <label>Falta receber</label>
                <div className="input-field">{item.saldo}</div>
              </div>
              <div className="compra-field">
                <label>Chegou agora</label>
                <input type="number" min="0" max={item.saldo} step="1" className="input-field" value={quantidades[item.id] ?? item.quantidade_a_receber} onChange={(e) => setQuantidades((prev) => ({ ...prev, [item.id]: e.target.value }))} />
              </div>
            </div>
          ))}
        </div>

        <div className="compra-modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={salvando}>{salvando ? 'Preparando...' : 'Preparar recebimento'}</button>
        </div>
      </form>
    </div>
  );
}
