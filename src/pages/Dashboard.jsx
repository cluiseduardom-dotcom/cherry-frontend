import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import {
  TrendingUp, ShoppingBag, Package, Users, BarChart3, ArrowRight, Star, PackageX, CheckCircle2, Hourglass,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { buscarResumoDashboard } from '../services/dashboard';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/themeContext';
import { ROLE_LABEL } from '../config/papeis';
import ParetoCurvaAbc from './ParetoCurvaAbc';
import { formatarMoeda } from './dashboardCurvaAbc';
import './Dashboard.css';

const CURVA_BADGE = { A: 'badge-success', B: 'badge-warning', C: 'badge-info' };
// Cores vêm de tokens do tema ativo (src/theme/themes.css).
const CURVA_COR = { A: 'var(--chart-a)', B: 'var(--chart-b)', C: 'var(--chart-c)' };
const ESTOQUE_COR = { comGiro: 'var(--chart-b)', semGiro: 'var(--chart-c)', esgotado: 'var(--color-accent)' };

function initials(nome) {
  return nome.split(' ').slice(0, 2).map(w => w[0]).join('');
}

// Alturas (em unidades do viewBox) das barras decorativas do hero. É só ornamento:
// não representa nenhum dado do negócio.
const HERO_BARRAS = [34, 46, 40, 62, 54, 78, 70, 96, 88, 112];

function HeroOrnamento({ imagem }) {
  // Marca-d'água da identidade (ex.: cereja do Cherry), quando o tema define uma.
  if (imagem) {
    return <span className="dashboard-hero-ornament-img" style={{ '--ornamento-url': `url(${imagem})` }} aria-hidden="true" />;
  }

  const passo = 38;
  const topo = HERO_BARRAS.map((h, i) => `${i * passo + 12},${140 - h}`).join(' ');

  return (
    <svg className="dashboard-hero-skyline" viewBox="0 0 400 150" preserveAspectRatio="xMaxYMax meet" aria-hidden="true" focusable="false">
      {HERO_BARRAS.map((h, i) => (
        <rect key={i} x={i * passo} y={140 - h} width={24} height={h} rx={2} />
      ))}
      <polyline points={topo} />
    </svg>
  );
}

function percent(parte, total) {
  return total ? `${Math.round((parte / total) * 100)}%` : '0%';
}

function PanelHead({ title, to, linkLabel }) {
  return (
    <div className="dashboard-card-head">
      <h2 className="section-title">{title}</h2>
      {to && <Link to={to} className="btn btn-ghost btn-sm">{linkLabel}</Link>}
    </div>
  );
}

function Donut({ data, total, totalLabel, ariaLabel }) {
  return (
    <div className="dash-donut">
      <div className="dash-donut-chart" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="100%"
              paddingAngle={data.filter(d => d.value > 0).length > 1 ? 2 : 0}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map(d => <Cell key={d.key} fill={d.color} />)}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="dash-donut-center">
          <strong>{total}</strong>
          <span>{totalLabel}</span>
        </div>
      </div>
      <ul className="dash-legend">
        {data.map(d => (
          <li key={d.key}>
            <span className="dash-legend-dot" style={{ background: d.color }} />
            <span className="dash-legend-label">{d.label}</span>
            <span className="dash-legend-value">{d.value}</span>
            <span className="dash-legend-pct">{percent(d.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { marca } = useTheme();
  const [resumo, setResumo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await buscarResumoDashboard();
        if (!cancelled) setResumo(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const curvaAbc = resumo?.curva_abc ?? [];
  const giro = resumo?.giro ?? [];
  const cobertura = resumo?.cobertura ?? [];

  const coberturaPorId = new Map(cobertura.map(c => [c.id, c.cobertura_dias]));
  const giroCobertura = giro
    .map(g => ({ ...g, cobertura_dias: coberturaPorId.get(g.id) ?? null }))
    .sort((a, b) => (b.giro ?? -1) - (a.giro ?? -1));

  const produtosCurvaA = curvaAbc.filter(p => p.curva === 'A').length;

  const girosValidos = giro.map(g => g.giro).filter(v => v !== null && v !== undefined);
  const giroMedio = girosValidos.length
    ? (girosValidos.reduce((s, v) => s + Number(v), 0) / girosValidos.length).toFixed(2)
    : null;

  const coberturasValidas = cobertura.map(c => c.cobertura_dias).filter(v => v !== null && v !== undefined);
  const coberturaMedia = coberturasValidas.length
    ? Math.round(coberturasValidas.reduce((s, v) => s + Number(v), 0) / coberturasValidas.length)
    : null;

  const produtosEsgotados = giro.filter(g => g.estoque_atual === 0).length;
  const produtosSemGiro = giro.filter(g => g.estoque_atual !== 0 && (g.giro === null || g.giro === undefined)).length;
  const produtosComGiro = giro.length - produtosEsgotados - produtosSemGiro;

  const statCards = [
    { key: 'curvaA',    label: 'Produtos Curva A', icon: Star,        value: curvaAbc.length ? produtosCurvaA : '—' },
    { key: 'giro',      label: 'Giro médio',        icon: TrendingUp,  value: giroMedio !== null ? `${giroMedio}x` : '—' },
    { key: 'cobertura', label: 'Cobertura média',   icon: BarChart3,   value: coberturaMedia !== null ? `${coberturaMedia} dias` : '—' },
    { key: 'esgotados', label: 'Produtos esgotados', icon: Package,    value: produtosEsgotados, isAlert: produtosEsgotados > 0 },
  ];

  const curvaTop = curvaAbc.slice(0, 8);

  const distribuicaoCurva = ['A', 'B', 'C'].map(c => ({
    key: c,
    label: `Curva ${c}`,
    value: curvaAbc.filter(p => p.curva === c).length,
    color: CURVA_COR[c],
  }));

  const situacaoEstoque = [
    { key: 'comGiro',  label: 'Com giro',  value: produtosComGiro,    color: ESTOQUE_COR.comGiro },
    { key: 'semGiro',  label: 'Sem giro',  value: produtosSemGiro,    color: ESTOQUE_COR.semGiro },
    { key: 'esgotado', label: 'Esgotados', value: produtosEsgotados,  color: ESTOQUE_COR.esgotado },
  ];

  const alertas = [
    produtosEsgotados > 0 && {
      key: 'esgotados', icon: PackageX, count: produtosEsgotados,
      text: produtosEsgotados === 1 ? 'produto esgotado' : 'produtos esgotados',
    },
    produtosSemGiro > 0 && {
      key: 'semGiro', icon: Hourglass, count: produtosSemGiro,
      text: produtosSemGiro === 1 ? 'produto com estoque e sem giro' : 'produtos com estoque e sem giro',
    },
  ].filter(Boolean);

  const showContent = !loading && !error;
  const primeiroNome = user?.nome?.trim().split(' ')[0];

  const quickActions = [
    { to: '/venda',      icon: ShoppingBag, title: 'Nova Venda', sub: 'Iniciar atendimento', tone: 'navy' },
    { to: '/produtos',   icon: Star,        title: 'Produtos',   sub: 'Gerenciar catálogo',  tone: 'blue' },
    { to: '/clientes',   icon: Users,       title: 'Clientes',   sub: 'Base de clientes',    tone: 'blue' },
    { to: '/relatorios', icon: BarChart3,   title: 'Relatórios', sub: 'Análise de dados',    tone: 'gold' },
  ];

  const atalhosPanel = (
    <section className="card dash-panel" aria-label="Atalhos">
      <PanelHead title="Atalhos" />
      <div className="dash-shortcuts">
        {quickActions.map(({ to, icon: Icon, title, sub, tone }) => (
          <Link key={to} to={to} className="quick-action-card">
            <div className={`quick-action-icon quick-action-icon--${tone}`}><Icon size={20} /></div>
            <div>
              <div className="quick-action-title">{title}</div>
              <div className="quick-action-sub">{sub}</div>
            </div>
            <ArrowRight size={16} className="quick-action-arrow" />
          </Link>
        ))}
      </div>
    </section>
  );

  return (
    <div className="page-content dashboard-page">
      {/* Hero */}
      <header className="dashboard-hero">
        <HeroOrnamento imagem={marca.ornamento} />
        <div className="dashboard-hero-text">
          <h1 className="page-title">{primeiroNome ? `Olá, ${primeiroNome}` : 'Dashboard'}</h1>
          <p className="page-subtitle">Dashboard · Visão geral do negócio</p>
        </div>
        {marca.slogan && (
          <figure className="dashboard-hero-quote">
            <blockquote>“{marca.slogan}”</blockquote>
            <figcaption>— {marca.sloganAutor || marca.nome}</figcaption>
          </figure>
        )}
        <div className="dashboard-hero-side">
          {user?.nome && (
            <div className="dashboard-hero-user">
              <Avatar nome={user.nome} fotoUrl={user.foto_url} className="dashboard-hero-avatar" />
              <span className="dashboard-hero-user-info">
                <span className="dashboard-hero-user-name">{user.nome}</span>
                {ROLE_LABEL[user.role] && <span className="dashboard-hero-user-role">{ROLE_LABEL[user.role]}</span>}
              </span>
            </div>
          )}
          <Link to="/venda" className="btn btn-primary btn-lg dashboard-cta">
            <ShoppingBag size={18} />
            Nova Venda
          </Link>
        </div>
      </header>

      {loading && (
        <div role="status" aria-busy="true" aria-label="Carregando dashboard">
          <div className="dashboard-stats">
            {statCards.map(({ key }) => (
              <div key={key} className="stat-card card card-padding">
                <div className="skeleton skeleton-line skeleton-line--sm" />
                <div className="skeleton skeleton-line skeleton-line--lg" />
              </div>
            ))}
          </div>
          <div className="dash-row dash-row--charts">
            {[0, 1, 2].map(i => (
              <div key={i} className="card dash-panel">
                <div className="dashboard-card-head"><div className="skeleton skeleton-line skeleton-line--md" /></div>
                <div className="dash-skeleton-block"><div className="skeleton skeleton-chart" /></div>
              </div>
            ))}
          </div>
          <div className="dash-row dash-row--lists">
            {[0, 1].map(i => (
              <div key={i} className="card dash-panel">
                <div className="dashboard-card-head"><div className="skeleton skeleton-line skeleton-line--md" /></div>
                <div className="dashboard-skeleton-list">
                  {[0, 1, 2, 3, 4].map(j => <div key={j} className="skeleton skeleton-row" />)}
                </div>
              </div>
            ))}
            <div className="dash-side">{atalhosPanel}</div>
          </div>
        </div>
      )}

      {error && !loading && (
        <>
          <div className="empty-state dashboard-error" role="alert">
            <div className="empty-state-title">Não foi possível carregar os dados do dashboard</div>
            <p className="text-sm text-secondary">{error}</p>
          </div>
          {atalhosPanel}
        </>
      )}

      {showContent && (
        <>
          {/* Indicadores */}
          <div className="dashboard-stats">
            {statCards.map(({ key, label, icon: Icon, value, isAlert }) => (
              <div key={key} className={`stat-card card card-padding ${isAlert ? 'stat-card--alert' : ''}`}>
                <div className="stat-card-icon-wrap">
                  <Icon size={20} strokeWidth={2} />
                </div>
                <div className="stat-card-body">
                  <span className="stat-card-label">{label}</span>
                  <div className="stat-card-value">{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Pareto + distribuição + atenção */}
          <div className="dash-row dash-row--charts">
            <section className="card dash-panel dash-panel--pareto" aria-label="Curva ABC por faturamento">
              <PanelHead title="Curva ABC por faturamento" to="/relatorios" linkLabel="Ver relatórios" />
              {curvaAbc.length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">Sem dados de faturamento</div></div>
              ) : (
                <ParetoCurvaAbc curvaAbc={curvaAbc} />
              )}
            </section>

            <section className="card dash-panel" aria-label="Distribuição da Curva ABC">
              <PanelHead title="Distribuição da Curva ABC" />
              {curvaAbc.length === 0 ? (
                <div className="empty-state"><div className="empty-state-title">Sem dados de faturamento</div></div>
              ) : (
                <Donut
                  data={distribuicaoCurva}
                  total={curvaAbc.length}
                  totalLabel="produtos"
                  ariaLabel="Distribuição de produtos por curva A, B e C"
                />
              )}
            </section>

            <section className="card dash-panel" aria-label="Atenção no estoque">
              <PanelHead title="Atenção no estoque" to="/estoque" linkLabel="Ver estoque" />
              {alertas.length === 0 ? (
                <div className="dash-alerts-empty">
                  <span className="dash-alerts-empty-icon"><CheckCircle2 size={28} /></span>
                  <div className="dash-alerts-empty-title">Nenhum alerta no momento</div>
                  <p className="dash-alerts-empty-text">Nenhum produto esgotado ou com estoque e sem giro.</p>
                </div>
              ) : (
                <ul className="dash-alerts">
                  {alertas.map(({ key, icon: Icon, count, text }) => (
                    <li key={key}>
                      <Link to="/estoque" className="dash-alert">
                        <span className="dash-alert-icon"><Icon size={18} /></span>
                        <span className="dash-alert-count">{count}</span>
                        <span className="dash-alert-text">{text}</span>
                        <ArrowRight size={14} className="dash-alert-arrow" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Tabelas + estoque + atalhos */}
          <div className="dash-row dash-row--lists">
            <section className="card dash-panel" aria-label="Curva ABC">
              <PanelHead title="Curva ABC" to="/produtos" linkLabel="Ver produtos" />
              {curvaTop.length > 0 && (
                <div className="top-products-list">
                  {curvaTop.map((p, i) => (
                    <div key={p.id} className="top-product-item">
                      <div className="top-product-rank">{i + 1}</div>
                      <div className="top-product-info">
                        <div className="top-product-name">
                          {p.nome}{' '}
                          <span className={`badge ${CURVA_BADGE[p.curva] ?? 'badge-info'}`}>{p.curva}</span>
                        </div>
                        <div className="top-product-sku">{p.percentual_acumulado}% acumulado</div>
                      </div>
                      <div className="top-product-price">{formatarMoeda(p.faturamento)}</div>
                    </div>
                  ))}
                </div>
              )}
              {curvaAbc.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Sem dados de faturamento</div>
                </div>
              )}
            </section>

            <section className="card dash-panel" aria-label="Giro e cobertura">
              <PanelHead title="Giro & Cobertura" to="/estoque" linkLabel="Ver estoque" />
              {giroCobertura.length > 0 && (
                <div className="recent-sales-list">
                  {giroCobertura.slice(0, 8).map(p => (
                    <div key={p.id} className="recent-sale-item">
                      <div className="recent-sale-avatar">{initials(p.nome)}</div>
                      <div className="recent-sale-info">
                        <div className="recent-sale-customer">{p.nome}</div>
                        <div className="recent-sale-meta">
                          estoque: {p.estoque_atual} · vendido: {p.quantidade_vendida_periodo}
                        </div>
                      </div>
                      <div className="recent-sale-right">
                        <div className="recent-sale-value">{p.giro !== null ? `${p.giro}x` : '—'}</div>
                        <span className="badge badge-primary">
                          {p.cobertura_dias !== null ? `${p.cobertura_dias}d cobertura` : 'sem giro'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {giroCobertura.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-title">Sem dados de giro no período</div>
                </div>
              )}
            </section>

            <div className="dash-side">
              <section className="card dash-panel" aria-label="Situação do estoque">
                <PanelHead title="Situação do estoque" to="/estoque" linkLabel="Ver estoque" />
                {giro.length === 0 ? (
                  <div className="empty-state"><div className="empty-state-title">Sem dados de giro no período</div></div>
                ) : (
                  <Donut
                    data={situacaoEstoque}
                    total={giro.length}
                    totalLabel="produtos"
                    ariaLabel="Situação dos produtos: com giro, sem giro e esgotados"
                  />
                )}
              </section>
              {atalhosPanel}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
