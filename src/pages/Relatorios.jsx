import { useState } from 'react';
import { ShoppingBag, Package, DollarSign, TrendingUp, Users, Boxes, ClipboardList, HandCoins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import RelatorioVendas from './relatorios/RelatorioVendas';
import RelatorioEstoque from './relatorios/RelatorioEstoque';
import RelatorioFinanceiro from './relatorios/RelatorioFinanceiro';
import RelatorioAnaliseVendas from './relatorios/RelatorioAnaliseVendas';
import RelatorioDesempenho from './relatorios/RelatorioDesempenho';
import RelatorioProdutos from './relatorios/RelatorioProdutos';
import RelatorioInventario from './relatorios/RelatorioInventario';
import RelatorioCredito from './relatorios/RelatorioCredito';
import './Relatorios.css';

const TABS = [
  { key: 'vendas', label: 'Vendas', icon: ShoppingBag },
  { key: 'estoque', label: 'Estoque', icon: Package },
  { key: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { key: 'analise-vendas', label: 'Análise de vendas', icon: TrendingUp },
  { key: 'desempenho', label: 'Desempenho', icon: Users },
  { key: 'produtos', label: 'Produtos', icon: Boxes },
  { key: 'inventario', label: 'Inventário', icon: ClipboardList },
  { key: 'credito', label: 'Crédito', icon: HandCoins },
];

export default function Relatorios() {
  const { user } = useAuth();
  const [relatorioAtivo, setRelatorioAtivo] = useState('vendas');

  // A rota /relatorios já é admin-only via ProtectedRoute, mas o conteúdo
  // também não deve renderizar caso esse componente seja usado fora dela.
  if (user?.role !== 'admin') {
    return (
      <div className="page-content">
        <div className="empty-state">
          <div className="empty-state-title">Acesso restrito</div>
          <p className="text-sm text-secondary">Relatórios estão disponíveis apenas para administradores.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Vendas, desempenho da equipe, produtos, estoque, financeiro e crédito</p>
        </div>
      </div>

      <div className="rel-tabs">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              className={`rel-tab ${relatorioAtivo === tab.key ? 'rel-tab--active' : ''}`}
              onClick={() => setRelatorioAtivo(tab.key)}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {relatorioAtivo === 'vendas' && <RelatorioVendas />}
      {relatorioAtivo === 'estoque' && <RelatorioEstoque />}
      {relatorioAtivo === 'financeiro' && <RelatorioFinanceiro />}
      {relatorioAtivo === 'analise-vendas' && <RelatorioAnaliseVendas />}
      {relatorioAtivo === 'desempenho' && <RelatorioDesempenho />}
      {relatorioAtivo === 'produtos' && <RelatorioProdutos />}
      {relatorioAtivo === 'inventario' && <RelatorioInventario />}
      {relatorioAtivo === 'credito' && <RelatorioCredito />}
    </div>
  );
}
