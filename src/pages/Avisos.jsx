import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BellOff, CheckCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotificacoes } from '../context/NotificacoesContext';
import { canAccessRoute } from '../config/access';
import { destinoDoAviso, rotuloDoTipo } from '../utils/notificacoes';
import './Avisos.css';

export default function Avisos() {
  const { user } = useAuth();
  const { itens, lidos, naoLidos, carregando, erro, recarregar, marcarComoLido, marcarTodosComoLidos } = useNotificacoes();
  const podeVerEstoque = canAccessRoute('/estoque', user);

  return (
    <div className="page-content avisos-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Avisos</h1>
          <p className="page-subtitle">
            {naoLidos > 0 ? `${naoLidos} aviso(s) novo(s) para decidir` : 'Nada novo para decidir agora'}
          </p>
        </div>
        <Link to="/mais" className="btn btn-ghost">
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <div className="avisos-acoes">
        <button type="button" className="btn btn-ghost" onClick={recarregar} disabled={carregando}>
          <RefreshCw size={16} />
          Atualizar
        </button>
        {naoLidos > 0 && (
          <button type="button" className="btn btn-ghost" onClick={marcarTodosComoLidos}>
            <CheckCheck size={16} />
            Marcar todos como lidos
          </button>
        )}
      </div>

      {erro && <div className="avisos-erro" role="alert">{erro}</div>}

      {!erro && !carregando && itens.length === 0 && (
        <div className="avisos-vazio card card-padding">
          <BellOff size={22} />
          <span>Sem avisos no momento. Estoque e giro estão dentro do esperado.</span>
        </div>
      )}

      <ul className="avisos-lista">
        {itens.map((aviso) => {
          const lido = lidos.includes(aviso.id);
          return (
            <li key={aviso.id} className={`avisos-item card card-padding avisos-${aviso.prioridade}${lido ? ' avisos-lido' : ''}`}>
              <div className="avisos-topo">
                <span className="avisos-tipo">{rotuloDoTipo(aviso.tipo)}</span>
                {aviso.item === 'insumo' && <span className="avisos-etiqueta">Insumo</span>}
                {!lido && <span className="avisos-novo">Novo</span>}
              </div>
              <p className="avisos-mensagem">{aviso.mensagem}</p>
              <p className="avisos-acao">{aviso.acao}</p>
              <div className="avisos-rodape">
                <Link
                  to={destinoDoAviso(aviso, podeVerEstoque)}
                  className="avisos-ir"
                  onClick={() => marcarComoLido(aviso.id)}
                >
                  Ver
                  <ArrowRight size={14} />
                </Link>
                {!lido && (
                  <button type="button" className="btn btn-ghost avisos-lido-btn" onClick={() => marcarComoLido(aviso.id)}>
                    Marcar como lido
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
