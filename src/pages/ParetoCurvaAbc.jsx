import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  configurarRotulos, eixoFaturamento, formatarMoeda, formatarMoedaCompacta, formatarPercentual, montarRotuloEixo, montarSeriePareto, posicionarValorHorizontal, posicionarValorVertical, rotulosDoEixo,
} from './dashboardCurvaAbc';

const CURVA_COR = { A: 'var(--chart-a)', B: 'var(--chart-b)', C: 'var(--chart-c)' };

// Colunas estreitas: base (y) da faixa de percentuais e margem superior do gráfico.
const FAIXA_TOPO_BASE = 56;
const MARGEM_TOPO_ESTREITA = 70;

// Contorno na cor do cartão para o texto continuar legível sobre barras e linha.
const HALO = { stroke: 'var(--color-bg-card)', strokeWidth: 3, paintOrder: 'stroke' };

function ParetoTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="dash-tooltip">
      <strong>{p.nome}</strong>
      {p.sku && <span>SKU: {p.sku}</span>}
      <span>Curva {p.curva}</span>
      <span>Faturamento: {formatarMoeda(p.faturamento)}</span>
      <span>Participação no total: {formatarPercentual(p.participacao)}</span>
      <span>Acumulado: {formatarPercentual(p.acumulado)}</span>
    </div>
  );
}

// Os três componentes abaixo recebem x/y/payload do Recharts por cloneElement;
// as demais props (rotulos, estreito, nomePorRank) vêm do elemento criado no JSX.
function TickNome({ x, y, payload, nomePorRank, rotulos, estreito }) {
  const rotulo = nomePorRank.get(payload.value);
  return (
    <g transform={`translate(${x},${y + 8})`}>
      <title>{rotulo.nome}{rotulo.sufixo}</title>
      <text
        fill="var(--color-text-subtle)"
        fontSize={estreito ? 10 : 11}
        textAnchor={rotulos.horizontal ? 'middle' : 'end'}
        transform={rotulos.horizontal ? undefined : 'rotate(-35)'}
        dy={rotulos.horizontal ? 8 : 4}
      >
        {montarRotuloEixo(rotulo, rotulos.maxCaracteres)}
      </text>
    </g>
  );
}

function RotuloValor({ x, y, width, height, value, index, rotulos, estreito, curvas, acumulados, eixoMax }) {
  const cx = x + width / 2;
  const texto = rotulos.valorCompleto ? formatarMoeda(value) : formatarMoedaCompacta(value);

  if (rotulos.valorVertical) {
    // y do ponto da linha nesta coluna, deduzido da escala das próprias colunas
    // (altura / valor) e do máximo do eixo; sem valor não há escala: fica fora.
    const baseY = y + height;
    const pontoY = value > 0
      ? baseY - (acumulados[index] / 100) * (eixoMax * (height / value))
      : NaN;
    const pos = posicionarValorVertical({ topoY: y, baseY, pontoY });

    return (
      <text
        x={cx}
        y={pos.y}
        fill={pos.modo === 'dentro'
          ? (curvas[index] === 'C' ? 'var(--color-text-primary)' : '#fff')
          : 'var(--color-text-primary)'}
        fontSize={10}
        fontWeight={700}
        textAnchor="start"
        dominantBaseline="central"
        transform={`rotate(-90 ${cx} ${pos.y})`}
        {...(pos.modo === 'fora' ? HALO : {})}
      >
        {texto}
      </text>
    );
  }

  const pontoYH = value > 0
    ? y + height - (acumulados[index] / 100) * (eixoMax * (height / value))
    : NaN;

  return (
    <text
      x={cx}
      y={posicionarValorHorizontal({ topoY: y, pontoY: pontoYH, alturaSelo: estreito ? 14 : 17 })}
      fill="var(--color-text-primary)"
      fontSize={estreito ? 10 : 11}
      fontWeight={700}
      textAnchor="middle"
      {...HALO}
    >
      {texto}
    </text>
  );
}
function RotuloPercentual({ x, y, value, estreito, rotulos }) {
  const texto = formatarPercentual(value);
  const largura = texto.length * (estreito ? 5.2 : 6.4) + 10;
  const altura = estreito ? 14 : 17;
  // Colunas estreitas: os percentuais formam uma faixa fixa no topo do gráfico,
  // na vertical e alinhados à coluna de cada ponto, para não cruzar os valores
  // das colunas nem se sobrepor entre si.
  const vertical = rotulos.valorVertical;
  const transform = vertical
    ? `translate(${x},${FAIXA_TOPO_BASE - largura / 2}) rotate(-90)`
    : `translate(${x},${y - 12})`;
  return (
    <g transform={transform}>
      <rect
        x={-largura / 2}
        y={-altura / 2}
        width={largura}
        height={altura}
        rx={altura / 2}
        fill="var(--color-bg-card)"
        stroke="var(--color-accent)"
        strokeWidth={1}
      />
      <text
        fill="var(--color-text-primary)"
        fontSize={estreito ? 10 : 11}
        fontWeight={700}
        textAnchor="middle"
        dy={estreito ? 3.5 : 4}
      >
        {texto}
      </text>
    </g>
  );
}

export default function ParetoCurvaAbc({ curvaAbc }) {
  const { pontos, total } = useMemo(() => montarSeriePareto(curvaAbc, 8), [curvaAbc]);
  const wrapRef = useRef(null);
  const [largura, setLargura] = useState(640);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => setLargura(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const estreito = largura < 480;
  const larguraEixoY = estreito ? 40 : 64;
  const larguraEixoPct = estreito ? 36 : 44;
  const rotulos = configurarRotulos(largura - larguraEixoY - larguraEixoPct - 8, pontos.length);
  const nomePorRank = rotulosDoEixo(pontos);
  const curvas = pontos.map(p => p.curva);
  const acumulados = pontos.map(p => p.acumulado);
  const eixo = eixoFaturamento(Math.max(0, ...pontos.map(p => p.faturamento)));

  if (total <= 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Sem faturamento registrado</div>
        <p className="text-sm text-secondary">Nenhuma venda finalizada gerou faturamento para os produtos ativos.</p>
      </div>
    );
  }

  return (
    <div className="dash-chart-wrap">
      <div
        ref={wrapRef}
        className="dash-chart dash-chart--pareto"
        role="img"
        aria-label="Gráfico de barras do faturamento por produto, com linha de percentual acumulado. Valores completos na tabela Curva ABC."
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={pontos} margin={{ top: rotulos.valorVertical ? MARGEM_TOPO_ESTREITA : 28, right: 4, bottom: 0, left: 0 }}>
            <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
            <XAxis
              dataKey="rank"
              interval={0}
              padding={{ left: rotulos.horizontal ? 0 : 28, right: 8 }}
              tickLine={false}
              axisLine={{ stroke: 'var(--color-border-light)' }}
              height={rotulos.alturaEixo}
              tick={<TickNome nomePorRank={nomePorRank} rotulos={rotulos} estreito={estreito} />}
            />
            <YAxis
              yAxisId="fat"
              domain={[0, eixo.max]}
              ticks={eixo.ticks}
              tickLine={false}
              axisLine={false}
              width={larguraEixoY}
              tick={{ fill: 'var(--color-text-subtle)', fontSize: 11 }}
              tickFormatter={v => Number(v).toLocaleString('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })}
            />
            <YAxis
              yAxisId="pct"
              orientation="right"
              domain={[0, 100]}
              tickLine={false}
              axisLine={false}
              width={larguraEixoPct}
              tick={{ fill: 'var(--color-text-subtle)', fontSize: 11 }}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<ParetoTooltip />} cursor={{ fill: 'var(--color-secondary-ultra)', fillOpacity: 0.5 }} />
            <Bar yAxisId="fat" dataKey="faturamento" radius={[4, 4, 0, 0]} maxBarSize={44} isAnimationActive={false}>
              {pontos.map(d => <Cell key={d.rank} fill={CURVA_COR[d.curva] ?? CURVA_COR.C} />)}
              <LabelList dataKey="faturamento" content={<RotuloValor rotulos={rotulos} estreito={estreito} curvas={curvas} acumulados={acumulados} eixoMax={eixo.max} />} />
            </Bar>
            <Line
              yAxisId="pct"
              type="monotone"
              dataKey="acumulado"
              stroke="var(--color-accent)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--color-accent)' }}
              isAnimationActive={false}
            >
              <LabelList dataKey="acumulado" content={<RotuloPercentual estreito={estreito} rotulos={rotulos} />} />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="dash-chart-legend">
        {['A', 'B', 'C'].map(c => (
          <li key={c}><span className="dash-legend-dot" style={{ background: CURVA_COR[c] }} />Curva {c}</li>
        ))}
        <li><span className="dash-legend-line" />% acumulado</li>
        <li className="dash-chart-note">Base: todas as vendas finalizadas</li>
      </ul>
    </div>
  );
}
