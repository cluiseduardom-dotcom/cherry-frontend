import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  LIMITE_CURVA_A, LIMITE_CURVA_B, PERIODO_PADRAO_DIAS,
  calcularCobertura, calcularGiro, simularCurvaAbc,
} from '../utils/dashboardFormulas';
import './DashboardCalculos.css';

const BASE = 'Entram apenas produtos acabados ativos da sua empresa. Insumos (embalagens, etiquetas, materiais) ficam de fora.';

const INDICADORES = [
  {
    nome: 'Produtos Curva A',
    formula: 'Quantidade de produtos classificados na Curva A',
    detalhe: 'A classificação está em "Curva ABC" abaixo. Não depende do período.',
  },
  {
    nome: 'Giro médio',
    formula: 'Soma do vendido no período ÷ soma do estoque atual (todos os produtos acabados ativos)',
    detalhe: `Giro do conjunto, com 2 casas decimais. Não é a média dos giros de cada produto: somam-se vendas e estoques
antes de dividir, para um produto pequeno não distorcer o resultado. É o mesmo número do relatório de giro e cobertura.`,
  },
  {
    nome: 'Cobertura média',
    formula: 'Soma do estoque atual ÷ (soma do vendido no período ÷ dias do período)',
    detalhe: `Cobertura do conjunto, arredondada em dias inteiros. Também soma antes de dividir. Sem nenhuma venda no período
não há cobertura e o card mostra "—".`,
  },
  {
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
  return valor === null ? '— (sem base de cálculo)' : `${String(valor).replace('.', ',')}${sufixo}`;
}

function Teste() {
  const [vendido, setVendido] = useState('30');
  const [estoque, setEstoque] = useState('12');
  const [dias, setDias] = useState(String(PERIODO_PADRAO_DIAS));

  const v = Number(vendido);
  const e = Number(estoque);
  const d = Number(dias);

  return (
    <section className="card dash-calc-card" aria-label="Teste as fórmulas">
      <h2 className="section-title">Teste com seus números</h2>
      <p className="text-sm text-secondary">Digite os valores de um produto e confira o resultado. Nada aqui é salvo.</p>
      <div className="calc-campos">
        <Campo rotulo="Vendido no período" valor={vendido} onChange={setVendido} />
        <Campo rotulo="Estoque atual" valor={estoque} onChange={setEstoque} />
        <Campo rotulo="Dias do período" valor={dias} onChange={setDias} />
      </div>
      <dl className="calc-resultado">
        <dt>Giro</dt>
        <dd>{fmt(calcularGiro(v, e), 'x')}</dd>
        <dt>Cobertura</dt>
        <dd>{fmt(calcularCobertura(v, e, d), ' dias')}</dd>
      </dl>
    </section>
  );
}

const EXEMPLO_FATURAMENTOS = [5000, 3000, 1000, 600, 400];

export default function DashboardCalculos() {
  const exemplo = simularCurvaAbc(EXEMPLO_FATURAMENTOS);
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page-content dash-calc">
      <header className="page-header">
        <div>
          <h1 className="page-title">Como os cálculos funcionam</h1>
          <p className="page-subtitle">Fórmulas dos indicadores e gráficos do Dashboard, para você conferir os números.</p>
        </div>
        <Link to="/" className="btn btn-ghost btn-sm"><ArrowLeft size={14} /> Voltar ao Dashboard</Link>
      </header>

      <section className="card dash-calc-card" aria-label="Base dos cálculos">
        <h2 className="section-title">Base dos cálculos</h2>
        <ul className="dash-calc-lista">
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

      <section className="card dash-calc-card" aria-label="Fórmulas básicas">
        <h2 className="section-title">Fórmulas por produto</h2>
        <div className="dash-calc-formulas">
          <div>
            <h3>Giro</h3>
            <code>giro = vendido no período ÷ estoque atual</code>
            <p>Quantas vezes o estoque atual &quot;virou&quot; no período. Arredondado em 2 casas. Sem resultado quando o estoque é 0.</p>
          </div>
          <div>
            <h3>Cobertura (dias)</h3>
            <code>cobertura = estoque atual ÷ (vendido no período ÷ dias do período)</code>
            <p>Quantos dias o estoque dura no ritmo de venda do período. Arredondada em 1 casa. Sem resultado quando nada foi vendido.</p>
          </div>
          <div>
            <h3>Faturamento do produto</h3>
            <code>faturamento = soma de (quantidade × preço unitário) dos itens vendidos</code>
            <p>Usa o preço unitário gravado em cada item da venda.</p>
          </div>
          <div>
            <h3>Curva ABC</h3>
            <code>acumulado = faturamento acumulado ÷ faturamento total</code>
            <p>
              Os produtos são ordenados do maior para o menor faturamento e o acumulado inclui o próprio produto.
              A: acumulado até {LIMITE_CURVA_A}%. B: acima de {LIMITE_CURVA_A}% até {LIMITE_CURVA_B}%. C: o restante.
              Se não houve faturamento algum, todos ficam em C.
            </p>
          </div>
        </div>
      </section>

      <section className="card dash-calc-card" aria-label="Indicadores">
        <h2 className="section-title">Os 4 indicadores do topo</h2>
        <dl className="dash-calc-def">
          {INDICADORES.map(i => (
            <div key={i.nome}>
              <dt>{i.nome}</dt>
              <dd><code>{i.formula}</code><p>{i.detalhe}</p></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card dash-calc-card" aria-label="Gráficos e tabelas">
        <h2 className="section-title">Gráficos e tabelas</h2>
        <dl className="dash-calc-def">
          {PAINEIS.map(p => (
            <div key={p.nome}>
              <dt>{p.nome}</dt>
              <dd><p>{p.texto}</p></dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card dash-calc-card" aria-label="Exemplo da Curva ABC">
        <h2 className="section-title">Exemplo da Curva ABC</h2>
        <p className="text-sm text-secondary">
          Cinco produtos, faturamento total de {brl(EXEMPLO_FATURAMENTOS.reduce((s, v) => s + v, 0))}. O produto 2 fecha
          exatamente em 80% e fica na A. O produto 3 faz o acumulado passar de 80% e por isso é B.
        </p>
        <div className="dash-calc-tabela-wrap">
          <table className="dash-calc-tabela">
            <thead>
              <tr><th>Posição</th><th>Faturamento</th><th>Acumulado</th><th>Curva</th></tr>
            </thead>
            <tbody>
              {exemplo.map(l => (
                <tr key={l.posicao}>
                  <td>{l.posicao}</td>
                  <td>{brl(l.faturamento)}</td>
                  <td>{String(l.percentual).replace('.', ',')}%</td>
                  <td>{l.curva}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Teste />

      <section className="card dash-calc-card" aria-label="Pontos de atenção">
        <h2 className="section-title">Pontos de atenção ao conferir</h2>
        <ul className="dash-calc-lista">
          <li>
            Giro médio e cobertura média somam vendas e estoques de todos os produtos ativos antes de dividir. Já o giro e a
            cobertura de cada linha da tabela são os do próprio produto.
          </li>
          <li>Produto sem venda no período fica sem cobertura, mesmo com estoque alto.</li>
          <li>
            Na Curva ABC o produto que faz o acumulado passar do limite entra na classe seguinte. Com poucos produtos, o
            primeiro pode fechar acima de 80% sozinho e cair na B ou na C.
          </li>
        </ul>
      </section>
    </div>
  );
}
