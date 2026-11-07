import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Star, TrendingUp, BarChart3, Package, Calculator, BookOpen, ListChecks, FlaskConical, Info } from 'lucide-react';
import {
  LIMITE_CURVA_A, LIMITE_CURVA_B, PERIODO_PADRAO_DIAS,
  calcularCobertura, calcularGiro, simularCurvaAbc,
} from '../utils/dashboardFormulas';
import './Dashboard.css';
import './DashboardCalculos.css';

const BASE = 'Entram apenas produtos acabados ativos da sua empresa. Insumos (embalagens, etiquetas, materiais) ficam de fora.';

const INDICADORES = [
  {
    icon: Star,
    nome: 'Produtos Curva A',
    formula: 'Quantidade de produtos classificados na Curva A',
    detalhe: 'A classificação está em "Curva ABC" abaixo. Não depende do período.',
  },
  {
    icon: TrendingUp,
    nome: 'Giro médio',
    formula: 'Soma do vendido no período ÷ soma do estoque atual (todos os produtos acabados ativos)',
    detalhe: `Giro do conjunto, com 2 casas decimais. Não é a média dos giros de cada produto: somam-se vendas e estoques
antes de dividir, para um produto pequeno não distorcer o resultado. É o mesmo número do relatório de giro e cobertura.`,
  },
  {
    icon: BarChart3,
    nome: 'Cobertura média',
    formula: 'Soma do estoque atual ÷ (soma do vendido no período ÷ dias do período)',
    detalhe: `Cobertura do conjunto, arredondada em dias inteiros. Também soma antes de dividir. Sem nenhuma venda no período
não há cobertura e o card mostra "—".`,
  },
  {
    icon: Package,
    nome: 'Produtos esgotados',
    formula: 'Quantidade de produtos com estoque atual = 0',
    detalhe: 'Fica em destaque quando é maior que zero.',
  },
];

const PAINEIS = [
  {
    nome: 'Curva ABC por faturamento (Pareto) e tabela Curva ABC',
    texto: `Barras: faturamento de cada produto, do maior para o menor (os 8 primeiros). Linha: percentual acumulado.
A tabela mostra os mesmos 8 primeiros com a classe.`,
  },
  {
    nome: 'Distribuição da Curva ABC',
    texto: 'Quantos produtos há em cada classe (A, B, C) e a participação de cada classe no total de produtos.',
  },
  {
    nome: 'Giro & Cobertura (tabela)',
    texto: `Os 8 produtos de maior giro. Mostra estoque, quantidade vendida no período, giro e cobertura em dias.
Produto sem cobertura aparece como "sem giro".`,
  },
  {
    nome: 'Situação do estoque',
    texto: `Esgotados: estoque atual = 0. Sem giro: estoque maior que 0 e nenhuma venda no período. Com giro: todos os
demais. As três fatias somam o total de produtos acabados ativos.`,
  },
  {
    nome: 'Atenção no estoque',
    texto: 'Mostra a contagem de produtos esgotados e a de produtos com estoque e sem giro, quando maiores que zero.',
  },
];

function Campo({ rotulo, valor, onChange }) {
  return (
    <label className="calc-campo">
      <span>{rotulo}</span>
      <input type="number" min="0" inputMode="decimal" value={valor} onChange={e => onChange(e.target.value)} />
    </label>
  );
}

function fmt(valor, sufixo) {
  return valor === null ? '—' : `${String(valor).replace('.', ',')}${sufixo}`;
}

function PanelHead({ icon: Icon, title }) {
  return (
    <div className="dashboard-card-head">
      <h2 className="section-title calc-panel-title">
        <span className="calc-panel-icon"><Icon size={16} /></span>
        {title}
      </h2>
    </div>
  );
}

function Teste() {
  const [vendido, setVendido] = useState('30');
  const [estoque, setEstoque] = useState('12');
  const [dias, setDias] = useState(String(PERIODO_PADRAO_DIAS));

  const v = Number(vendido);
  const e = Number(estoque);
  const d = Number(dias);
  const giro = calcularGiro(v, e);
  const cobertura = calcularCobertura(v, e, d);

  return (
    <section className="card dash-panel" aria-label="Teste as fórmulas">
      <PanelHead icon={FlaskConical} title="Teste com seus números" />
      <div className="calc-panel-body">
        <p className="text-sm text-secondary">Digite os valores de um produto e confira o resultado. Nada aqui é salvo.</p>
        <div className="calc-campos">
          <Campo rotulo="Vendido no período" valor={vendido} onChange={setVendido} />
          <Campo rotulo="Estoque atual" valor={estoque} onChange={setEstoque} />
          <Campo rotulo="Dias do período" valor={dias} onChange={setDias} />
        </div>
        <div className="calc-resultados">
          <div className="calc-resultado">
            <span className="calc-resultado-label">Giro</span>
            <span className="calc-resultado-valor">{fmt(giro, 'x')}</span>
            {giro === null && <span className="calc-resultado-nota">sem base de cálculo</span>}
          </div>
          <div className="calc-resultado">
            <span className="calc-resultado-label">Cobertura</span>
            <span className="calc-resultado-valor">{fmt(cobertura, ' dias')}</span>
            {cobertura === null && <span className="calc-resultado-nota">sem base de cálculo</span>}
          </div>
        </div>
      </div>
    </section>
  );
}

const EXEMPLO_FATURAMENTOS = [5000, 3000, 1000, 600, 400];
const CURVA_BADGE = { A: 'badge-success', B: 'badge-warning', C: 'badge-info' };

export default function DashboardCalculos() {
  const exemplo = simularCurvaAbc(EXEMPLO_FATURAMENTOS);
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page-content dashboard-page dash-calc">
      <header className="dashboard-hero">
        <div className="dashboard-hero-text">
          <h1 className="page-title">Como os cálculos funcionam</h1>
          <p className="page-subtitle">Fórmulas dos indicadores e gráficos do Dashboard, para você conferir os números.</p>
        </div>
        <Link to="/" className="btn btn-primary"><ArrowLeft size={16} /> Voltar ao Dashboard</Link>
      </header>

      <div className="dashboard-stats">
        {INDICADORES.map(({ nome, icon: Icon, formula }) => (
          <div key={nome} className="stat-card card card-padding">
            <div className="stat-card-icon-wrap"><Icon size={20} strokeWidth={2} /></div>
            <div className="stat-card-body">
              <span className="stat-card-label">{nome}</span>
              <div className="calc-stat-formula">{formula}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="calc-row">
        <section className="card dash-panel" aria-label="Base dos cálculos">
          <PanelHead icon={BookOpen} title="Base dos cálculos" />
          <ul className="calc-lista">
            <li>{BASE}</li>
            <li>
              Só contam vendas com status <strong>finalizada</strong>. Vendas canceladas não entram.
            </li>
            <li>
              Giro e cobertura usam as vendas dos últimos <strong>{PERIODO_PADRAO_DIAS} dias</strong> (padrão do sistema).
              A Curva ABC usa todas as vendas finalizadas, sem limite de período.
            </li>
            <li>Estoque atual é o saldo total do produto, somando todos os locais.</li>
          </ul>
        </section>

        <section className="card dash-panel" aria-label="Fórmulas básicas">
          <PanelHead icon={Calculator} title="Fórmulas por produto" />
          <div className="calc-formulas">
            <div className="calc-formula">
              <h3>Giro</h3>
              <code>giro = vendido no período ÷ estoque atual</code>
              <p>Quantas vezes o estoque atual &quot;virou&quot; no período. Arredondado em 2 casas. Sem resultado quando o estoque é 0.</p>
            </div>
            <div className="calc-formula">
              <h3>Cobertura (dias)</h3>
              <code>cobertura = estoque atual ÷ (vendido no período ÷ dias do período)</code>
              <p>Quantos dias o estoque dura no ritmo de venda do período. Arredondada em 1 casa. Sem resultado quando nada foi vendido.</p>
            </div>
            <div className="calc-formula">
              <h3>Faturamento do produto</h3>
              <code>faturamento = soma de (quantidade × preço unitário) dos itens vendidos</code>
              <p>Usa o preço unitário gravado em cada item da venda.</p>
            </div>
            <div className="calc-formula">
              <h3>Curva ABC</h3>
              <code>acumulado anterior = faturamento dos produtos acima ÷ faturamento total</code>
              <p>
                Os produtos são ordenados do maior para o menor faturamento. A classe depende do acumulado ANTES do
                produto: A se for menor que {LIMITE_CURVA_A}%, B se for menor que {LIMITE_CURVA_B}%, C no restante. Assim, o
                produto que faz o acumulado cruzar o limite fica na classe que o limite fecha, e o primeiro produto é sempre
                A. Se não houve faturamento algum, todos ficam em C.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="card dash-panel calc-indicadores" aria-label="Indicadores">
        <PanelHead icon={ListChecks} title="Os 4 indicadores do topo" />
        <ul className="calc-defs">
          {INDICADORES.map(({ nome, icon: Icon, formula, detalhe }) => (
            <li key={nome} className="calc-def">
              <span className="calc-def-icon"><Icon size={18} /></span>
              <div className="calc-def-body">
                <div className="calc-def-nome">{nome}</div>
                <code>{formula}</code>
                <p>{detalhe}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="calc-row">
        <section className="card dash-panel" aria-label="Exemplo da Curva ABC">
          <PanelHead icon={Star} title="Exemplo da Curva ABC" />
          <p className="calc-panel-texto text-sm text-secondary">
            Cinco produtos, faturamento total de {brl(EXEMPLO_FATURAMENTOS.reduce((s, v) => s + v, 0))}. Antes do produto 2
            o acumulado era 50%, então ele é A (mesmo fechando em 80%). Antes do produto 3 já eram 80%, então ele é B. O
            produto 4 começa em 90% e é B; o produto 5 começa em 96% e é C.
          </p>
          <div className="top-products-list">
            {exemplo.map(l => (
              <div key={l.posicao} className="top-product-item">
                <div className="top-product-rank">{l.posicao}</div>
                <div className="top-product-info">
                  <div className="top-product-name">
                    Produto {l.posicao}{' '}
                    <span className={`badge ${CURVA_BADGE[l.curva] ?? 'badge-info'}`}>{l.curva}</span>
                  </div>
                  <div className="top-product-sku">{String(l.percentual).replace('.', ',')}% acumulado</div>
                </div>
                <div className="top-product-price">{brl(l.faturamento)}</div>
              </div>
            ))}
          </div>
        </section>

        <Teste />
      </div>

      <div className="calc-row">
        <section className="card dash-panel" aria-label="Gráficos e tabelas">
          <PanelHead icon={BarChart3} title="Gráficos e tabelas" />
          <ul className="calc-defs">
            {PAINEIS.map(p => (
              <li key={p.nome} className="calc-def calc-def--simples">
                <div className="calc-def-body">
                  <div className="calc-def-nome">{p.nome}</div>
                  <p>{p.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card dash-panel" aria-label="Pontos de atenção">
          <PanelHead icon={Info} title="Pontos de atenção ao conferir" />
          <ul className="calc-lista">
            <li>
              Giro médio e cobertura média somam vendas e estoques de todos os produtos ativos antes de dividir. Já o giro e a
              cobertura de cada linha da tabela são os do próprio produto.
            </li>
            <li>Produto sem venda no período fica sem cobertura, mesmo com estoque alto.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
