import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { obterResultadoPeriodo } from '../services/vendas';
import { formatarMoeda, formatarPct, montarSerieGrafico, periodoUltimosMeses } from '../utils/resultadoVendas';
import './GraficoResultado.css';

const OPCOES = [
  { meses: 3, rotulo: '3 meses' },
  { meses: 6, rotulo: '6 meses' },
  { meses: 12, rotulo: '12 meses' },
];

const SERIES = [
  { chave: 'receita', nome: 'Faturamento', cor: 'var(--chart-c)', pct: null },
  { chave: 'lucro_bruto', nome: 'Lucro bruto', cor: 'var(--chart-b)', pct: 'margem_bruta_pct' },
  { chave: 'lucro_liquido', nome: 'Lucro líquido', cor: 'var(--chart-a)', pct: 'margem_liquida_pct' },
];

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatarCompacta(valor) {
  const n = Number(valor ?? 0);
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1).replace('.', ',')} mi`;
  if (abs >= 1_000) return `R$ ${(n / 1_000).toFixed(abs >= 10_000 ? 0 : 1).replace('.', ',')} mil`;
  return `R$ ${Math.round(n)}`;
}

function TooltipResultado({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="dash-tooltip">
      <strong>{p.rotulo}</strong>
      {SERIES.map(s => (
        <span key={s.chave}>
          {s.nome}: {formatarMoeda(p[s.chave])}{s.pct ? ` (${formatarPct(p[s.pct])} do faturamento)` : ''}
        </span>
      ))}
    </div>
  );
}

// Faturamento, lucro bruto e lucro líquido mês a mês. Os números vêm do backend (GET /vendas/resultado);
// o Dashboard só monta este gráfico para quem tem `ver_custos` + `ver_vendas_de_todos`.
export default function GraficoResultado() {
  const [meses, setMeses] = useState(6);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let cancelado = false;

    obterResultadoPeriodo(periodoUltimosMeses(hojeISO(), meses))
      .then(res => { if (!cancelado) { setDados(res); setErro(''); } })
      .catch(err => { if (!cancelado) { setDados(null); setErro(err.message); } })
      .finally(() => { if (!cancelado) setCarregando(false); });

    return () => { cancelado = true; };
  }, [meses]);

  function escolher(n) {
    if (n === meses) return;
    setCarregando(true);
    setErro('');
    setMeses(n);
  }

  const pontos = useMemo(() => montarSerieGrafico(dados?.serie), [dados]);
  const t = dados?.totais;
  const semVendas = !carregando && !erro && t && Number(t.vendas) === 0;

  return (
    <section className="card dash-panel grafico-resultado" aria-label="Faturamento e lucro por mês">
      <div className="dashboard-card-head">
        <h2 className="section-title">Faturamento e lucro por mês</h2>
        <div className="grafico-resultado-opcoes">
          {OPCOES.map(o => (
            <button key={o.meses} type="button" className={`btn btn-sm ${meses === o.meses ? 'btn-primary' : 'btn-ghost'}`} onClick={() => escolher(o.meses)}>
              {o.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="grafico-resultado-corpo">
        {carregando && <p className="text-sm text-secondary">Calculando...</p>}
        {!carregando && erro && <p className="resultado-erro" role="alert">{erro}</p>}
        {semVendas && <div className="empty-state"><div className="empty-state-title">Nenhuma venda concluída no período</div></div>}

        {!carregando && !erro && t && !semVendas && (
          <>
            <div className="grafico-resultado-resumo">
              <span>Faturamento <strong>{formatarMoeda(t.receita)}</strong></span>
              <span>Lucro bruto <strong>{formatarMoeda(t.lucro_bruto)}</strong> <em>{formatarPct(t.margem_bruta_pct)}</em></span>
              <span>Lucro líquido <strong>{formatarMoeda(t.lucro_liquido)}</strong> <em>{formatarPct(t.margem_liquida_pct)}</em></span>
            </div>
            <div className="grafico-resultado-chart" role="img" aria-label={`Barras mensais de faturamento, lucro bruto e lucro líquido dos últimos ${meses} meses`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pontos} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="22%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border-light)" />
                  <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} tickLine={false} />
                  <YAxis tickFormatter={formatarCompacta} tick={{ fontSize: 11, fill: 'var(--color-text-subtle)' }} tickLine={false} axisLine={false} width={74} />
                  <Tooltip content={<TooltipResultado />} cursor={{ fill: 'rgba(var(--color-primary-rgb), 0.06)' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} formatter={nome => <span style={{ color: 'var(--color-text-subtle)' }}>{nome}</span>} />
                  {SERIES.map(s => (
                    <Bar key={s.chave} dataKey={s.chave} name={s.nome} fill={s.cor} radius={[4, 4, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
