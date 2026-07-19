import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Venda from './pages/Venda';
import Estoque from './pages/Estoque';
import Produtos from './pages/Produtos';
import Clientes from './pages/Clientes';
import Historico from './pages/Historico';
import Relatorios from './pages/Relatorios';
import Configuracoes from './pages/Configuracoes';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<Login />} />

        {/* Main app layout */}
        <Route element={<Layout />}>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/venda"         element={<Venda />} />
          <Route path="/estoque"       element={<Estoque />} />
          <Route path="/produtos"      element={<Produtos />} />
          <Route path="/clientes"      element={<Clientes />} />
          <Route path="/historico"     element={<Historico />} />
          <Route path="/relatorios"    element={<Relatorios />} />
          <Route path="/configuracoes" element={<Configuracoes />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}
