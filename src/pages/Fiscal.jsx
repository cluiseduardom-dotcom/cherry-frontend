import { useState } from 'react';
import { Building2, ClipboardCheck, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProntidaoFiscal from '../components/fiscal/ProntidaoFiscal';
import EmpresaFiscalForm from '../components/fiscal/EmpresaFiscalForm';
import ProdutosFiscais from '../components/fiscal/ProdutosFiscais';
import './Relatorios.css';
import './Fiscal.css';

// Preparo fiscal: só cadastro, nenhuma nota é emitida. Admin vê tudo; estoquista só os produtos (NCM e origem são dado de catálogo).
export default function Fiscal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const ehAdmin = user?.role === 'admin';
  const abas = [
    ...(ehAdmin ? [{ chave: 'prontidao', rotulo: 'Prontidão', icone: ClipboardCheck }, { chave: 'empresa', rotulo: 'Empresa', icone: Building2 }] : []),
    { chave: 'produtos', rotulo: 'Produtos', icone: Package },
  ];
  const [ativa, setAtiva] = useState(abas[0].chave);
  const [versao, setVersao] = useState(0);
  const recarregar = () => setVersao(v => v + 1);

  function ir(destino) {
    // CNPJ, razão social e endereço ficam em Dados da empresa; o resto é desta tela.
    if (destino === 'cadastro') navigate('/configuracoes/empresa');
    else setAtiva(destino);
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fiscal</h1>
          <p className="page-subtitle">Deixe o cadastro pronto para a emissão de nota. Nenhuma nota é emitida por aqui.</p>
        </div>
      </div>

      <div className="rel-tabs">
        {abas.map(({ chave, rotulo, icone: Icone }) => (
          <button key={chave} type="button" className={`rel-tab ${ativa === chave ? 'rel-tab--active' : ''}`} onClick={() => setAtiva(chave)}>
            <Icone size={16} />
            {rotulo}
          </button>
        ))}
      </div>

      {ativa === 'prontidao' && (
        <>
          <ProntidaoFiscal versao={versao} onIr={ir} />
          <p className="text-sm text-secondary fiscal-cadastro-link">CNPJ, razão social e endereço: <Link to="/configuracoes/empresa">Dados da empresa</Link>.</p>
        </>
      )}
      {ativa === 'empresa' && <EmpresaFiscalForm onSalvo={recarregar} />}
      {ativa === 'produtos' && <ProdutosFiscais onMudou={recarregar} />}
    </div>
  );
}
