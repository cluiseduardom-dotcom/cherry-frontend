import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { homeRouteForRole, ALLOWED_ROLES_BY_PATH } from './config/roles';
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

function Fallback() {
  const { isAuthenticated, user } = useAuth();
  return <Navigate to={isAuthenticated ? homeRouteForRole(user.role) : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Main app layout */}
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/"              element={<ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH['/']}><Dashboard /></ProtectedRoute>} />
        <Route path="/venda"         element={<ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH['/venda']}><Venda /></ProtectedRoute>} />
        <Route path="/estoque"       element={<Estoque />} />
        <Route path="/produtos"      element={<Produtos />} />
        <Route path="/clientes"      element={<Clientes />} />
        <Route path="/historico"     element={<Historico />} />
        <Route path="/relatorios"    element={<ProtectedRoute allowedRoles={ALLOWED_ROLES_BY_PATH['/relatorios']}><Relatorios /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<Configuracoes />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Fallback />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
