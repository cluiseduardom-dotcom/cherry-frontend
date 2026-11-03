import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { listarCartaoSemVenda } from '../../services/pixDevolucao';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarDataHora } from '../../utils/formatarComissao';
import { rotuloCartaoPago, rotuloOrigemPix } from '../../utils/pixDevolucao';

// Parte visual (sem efeitos): testável sem DOM.
export function CartaoSemVendaTabela({ items, total, valorTotal }) {
  if (!items.length) return null;

  return (
    <div className="card">
      <h3 className="comissoes-subtitulo" style={{ padding: 'var(--space-4) var(--space-4) 0' }}>
        <CreditCard size={16} aria-hidden="true" /> Cartão recebido sem venda
      </h3>
      <p className="text-sm text-secondary" style={{ padding: '0 var(--space-4)' }}>
        O cliente pagou no link de cartão, mas o pagamento não está em nenhuma venda ativa. A devolução do cartão
        ainda é feita no painel do Mercado Pago (a lista se atualiza depois do estorno).
      </p>
      <div className="table-scroll">
        <table className="tabela-gestao">
          <thead>
            <tr>
              <th>Cobrado em</th>
              <th>Origem</th>
              <th>Cartão</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.codigo}>
                <td>{formatarDataHora(item.criado_em)}</td>
                <td>{rotuloOrigemPix(item)}</td>
                <td>{rotuloCartaoPago(item)}</td>
                <td><strong>{formatarMoeda(item.valor)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="comissoes-pagination">
        <span className="text-sm text-secondary">{total} pagamento(s) · {formatarMoeda(valorTotal)} a devolver no Mercado Pago</span>
      </div>
    </div>
  );
}

// Só aparece se houver algo: o fluxo comum (Pix) não ganha ruído. Falha de rede/API antiga não derruba a aba.
export default function CartaoSemVendaSecao({ refreshKey }) {
  const [dados, setDados] = useState({ items: [], total: 0, valor_total: '0.00' });

  useEffect(() => {
    let cancelado = false;
    listarCartaoSemVenda({ page: 1, pageSize: 20 })
      .then(d => { if (!cancelado) setDados(d); })
      .catch(() => { if (!cancelado) setDados({ items: [], total: 0, valor_total: '0.00' }); });
    return () => { cancelado = true; };
  }, [refreshKey]);

  return <CartaoSemVendaTabela items={dados.items} total={dados.total} valorTotal={dados.valor_total} />;
}
