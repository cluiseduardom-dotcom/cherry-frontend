import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ReferenceDot
} from 'recharts';
import { Link } from 'react-router-dom';
import './GraficoPontoEquilibrio.css';

const COR_OURO = '#C9A24B';
const PONTOS_SERIE = 20;

function formatCurrency(value) {
  return Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatCurrencyCompacta(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: 'compact',
    maximumFractionDigits: 1
  }).format(value ?? 0);
}

function gerarSerie({ custoFixoTotal, margemContribuicao, receita, pontoEquilibrio }) {
  const maiorReferencia = Math.max(receita ?? 0, pontoEquilibrio ?? 0);
  const max = maiorReferencia > 0 ? maiorReferencia * 1.3 : 1000;
  const passo = max / PONTOS_SERIE;

  return Array.from({ length: PONTOS_SERIE + 1 }, (_, i) => {
    const volume = passo * i;
    const custoVariavel = volume * (1 - margemContribuicao);
    return {
      volume,
      receita: volume,
      custoTotal: custoFixoTotal + custoVariavel
    };
  });
}

function GraficoTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="grafico-pe-tooltip">
      <div className="grafico-pe-tooltip-titulo">Volume de vendas: {formatCurrency(label)}</div>
      {payload.map(item => (
        <div key={item.dataKey} className="grafico-pe-tooltip-linha">
          <span className="grafico-pe-tooltip-dot" style={{ background: item.color }} />
          {item.name}: {formatCurrency(item.value)}
        </div>
      ))}
    </div>
  );
}

export default function GraficoPontoEquilibrio({ resultado }) {
  if (!resultado || resultado.semDespesasFixas) {
    return (
      <div className="card card-padding grafico-pe grafico-pe--vazio">
        <div className="grafico-pe-titulo">Simulação: receita vs. custo total</div>
        <p className="text-sm text-secondary">
          Nenhuma despesa fixa cadastrada para este período — sem custo fixo real, não há reta de
          custo pra simular.{' '}
          <Link to="/despesas-fixas">Cadastrar despesas fixas</Link>
        </p>
      </div>
    );
  }

  const { receita, custoFixoTotal, margemContribuicao, pontoEquilibrio, inviavel } = resultado;
  const dados = gerarSerie({ custoFixoTotal, margemContribuicao, receita, pontoEquilibrio });

  return (
    <div className="card card-padding grafico-pe">
      <div className="grafico-pe-titulo">Simulação: receita vs. custo total</div>

      {inviavel && (
        <p className="text-sm text-secondary grafico-pe-aviso">
          A margem de contribuição está zerada ou negativa neste período: o custo variável supera
          a receita em qualquer volume de vendas, então não existe ponto de equilíbrio real — a
          linha de custo total nunca fica abaixo da de receita.
        </p>
      )}

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={dados} margin={{ top: 16, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="var(--color-border-light)" vertical={false} />
          <XAxis
            dataKey="volume"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatCurrencyCompacta}
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            tickFormatter={formatCurrencyCompacta}
            stroke="var(--color-text-muted)"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip content={<GraficoTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12 }} />

          <Line
            type="monotone"
            dataKey="receita"
            name="Receita"
            stroke="var(--color-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />
          <Line
            type="monotone"
            dataKey="custoTotal"
            name="Custo total"
            stroke="var(--color-text-secondary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 5 }}
          />

          {!inviavel && pontoEquilibrio != null && (
            <>
              <ReferenceLine
                x={pontoEquilibrio}
                stroke={COR_OURO}
                strokeDasharray="4 4"
                label={{ value: 'Ponto de equilíbrio', position: 'top', fill: COR_OURO, fontSize: 11 }}
              />
              <ReferenceDot
                x={pontoEquilibrio}
                y={pontoEquilibrio}
                r={5}
                fill={COR_OURO}
                stroke="var(--color-bg-card)"
                strokeWidth={2}
              />
            </>
          )}

          <ReferenceDot
            x={receita}
            y={receita}
            r={5}
            fill="var(--color-primary)"
            stroke="var(--color-bg-card)"
            strokeWidth={2}
            label={props => {
              const { viewBox } = props;
              const x = (viewBox?.cx ?? viewBox?.x ?? 0) + 8;
              const y = (viewBox?.cy ?? viewBox?.y ?? 0) - 8;
              return (
                <text x={x} y={y} textAnchor="start" fontSize={11} fill="var(--color-primary)">
                  Você está aqui
                </text>
              );
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
