import { Check, Clock, TriangleAlert, X } from 'lucide-react';
import { formatarData } from '../../utils/formatarData';
import './ComprasTimeline.css';

// Cada etapa reflete o que o backend realmente registra para uma COMPRA
// DIRETA (tabela `compras`): ela nasce direto como 'recebido' numa única
// transação, sem OC/Cotação/PC/NF-e como etapas prévias. O módulo de
// pedidos de compra + recebimentos (pedidos_compra/recebimentos, com
// aprovação transacional real) existe no backend e é usado pela "Compra
// planejada" — mas é um fluxo paralelo e sem relação de chave estrangeira
// com `compras`, então não aparece nesta timeline. Etapas sem dado real
// não aparecem aqui: preferimos uma timeline curta e honesta a uma longa
// e fabricada.
export function montarTimelineCompra(compra) {
  if (!compra) return [];

  const cancelada = compra.status === 'cancelado';
  const aPrazo = compra.forma_pagamento === 'prazo';
  const quantidadeTotal = (compra.itens || []).reduce((soma, item) => soma + Number(item.quantidade || 0), 0);

  const passos = [
    {
      key: 'registro',
      titulo: 'Compra registrada',
      data: compra.data_compra,
      estado: 'concluido',
    },
    {
      key: 'estoque',
      titulo: cancelada ? 'Estoque estornado' : 'Entrada no estoque registrada',
      detalhe: quantidadeTotal > 0 ? `${quantidadeTotal} unidade(s)` : null,
      data: compra.atualizado_em || compra.criado_em,
      estado: 'concluido',
    },
    {
      key: 'financeiro',
      // Só descreve a forma de pagamento registrada na compra — não afirma
      // que o valor foi efetivamente recebido/liquidado, já que o backend
      // não retorna um status de liquidação para compras à vista (ver
      // docs/ai/COMPRAS-UX-GPT-VALIDATION.md).
      titulo: aPrazo ? 'Conta a pagar gerada' : 'Forma de pagamento: à vista',
      detalhe: aPrazo
        ? `Prazo de ${compra.dias_prazo || '—'} dia(s) — status detalhado em Contas a Pagar`
        : null,
      estado: aPrazo ? 'atencao' : 'concluido',
    },
  ];

  if (cancelada) {
    passos.push({
      key: 'cancelamento',
      titulo: 'Compra cancelada',
      data: compra.atualizado_em,
      estado: 'divergencia',
    });
  }

  return passos;
}

const ICON_BY_ESTADO = {
  concluido: Check,
  atencao: Clock,
  divergencia: TriangleAlert,
  cancelado: X,
};

export default function ComprasTimeline({ compra }) {
  const passos = montarTimelineCompra(compra);

  if (!passos.length) return null;

  return (
    <ol className="compras-timeline">
      {passos.map(passo => {
        const Icon = ICON_BY_ESTADO[passo.estado] || Check;
        return (
          <li key={passo.key} className={`compras-timeline-step compras-timeline-step--${passo.estado}`}>
            <span className="compras-timeline-icon"><Icon size={14} /></span>
            <div className="compras-timeline-content">
              <span className="compras-timeline-title">{passo.titulo}</span>
              {passo.data !== undefined && <span className="compras-timeline-date">{formatarData(passo.data)}</span>}
              {passo.detalhe && <span className="compras-timeline-detail">{passo.detalhe}</span>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
