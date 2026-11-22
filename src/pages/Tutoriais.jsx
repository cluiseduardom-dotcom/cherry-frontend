import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Clock, GraduationCap } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  buscarTutorial,
  caminhoDoTutorial,
  lerTutoriaisLidos,
  marcarTutorialLido,
  passosParaUsuario,
  tutorialVisivel,
  tutoriaisParaUsuario,
} from '../utils/tutoriais';
import './Tutoriais.css';

function ListaTutoriais({ lidos, user }) {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tutoriais</h1>
          <p className="page-subtitle">Passo a passo dos processos principais do sistema</p>
        </div>
      </div>

      <div className="tutoriais-grid">
        {tutoriaisParaUsuario(user).map(tutorial => {
          const lido = lidos.includes(tutorial.id);
          return (
            <Link key={tutorial.id} to={caminhoDoTutorial(tutorial.id)} className="tutoriais-card card card-padding">
              <span className="tutoriais-card-icon"><GraduationCap size={20} /></span>
              <span className="tutoriais-card-content">
                <span className="tutoriais-card-title">{tutorial.titulo}</span>
                <span className="tutoriais-card-sub">{tutorial.resumo}</span>
                <span className="tutoriais-card-meta">
                  <Clock size={13} aria-hidden="true" /> {tutorial.minutos} min
                  {lido && (
                    <span className="tutoriais-card-lido"><Check size={13} aria-hidden="true" /> Lido</span>
                  )}
                </span>
              </span>
              <ArrowRight size={17} className="tutoriais-card-arrow" aria-hidden="true" />
            </Link>
          );
        })}
      </div>
    </>
  );
}

function DetalheTutorial({ tutorial, user, onConcluir }) {
  const navigate = useNavigate();
  const passos = passosParaUsuario(tutorial, user);

  return (
    <>
      <div className="page-header">
        <div>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate('/tutoriais')}>
            <ArrowLeft size={15} />
            Tutoriais
          </button>
          <h1 className="page-title">{tutorial.titulo}</h1>
          <p className="page-subtitle">{tutorial.resumo}</p>
        </div>
      </div>

      <ol className="tutoriais-passos">
        {passos.map((passo, indice) => (
          <li key={passo.titulo} className="tutoriais-passo card card-padding">
            <span className="tutoriais-passo-numero" aria-hidden="true">{indice + 1}</span>
            <div className="tutoriais-passo-corpo">
              <h2 className="tutoriais-passo-titulo">{passo.titulo}</h2>
              <p className="tutoriais-passo-texto">{passo.texto}</p>
              {passo.dica && <p className="tutoriais-passo-dica"><strong>Dica:</strong> {passo.dica}</p>}
              {passo.rota && (
                <Link to={passo.rota} className="btn btn-secondary btn-sm">
                  {passo.rotuloRota || 'Abrir tela'}
                  <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <div className="tutoriais-rodape">
        <button type="button" className="btn btn-primary" onClick={onConcluir}>
          <Check size={16} />
          Entendi, marcar como lido
        </button>
      </div>
    </>
  );
}

export default function Tutoriais() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [lidos, setLidos] = useState(() => lerTutoriaisLidos());

  // Tutorial de módulo que o usuário não pode abrir (papel ou plano) se comporta como inexistente.
  const achado = id ? buscarTutorial(id) : null;
  const tutorial = tutorialVisivel(achado, user) ? achado : null;

  function concluir() {
    setLidos(marcarTutorialLido(tutorial.id));
    navigate('/tutoriais');
  }

  return (
    <div className="page-content tutoriais-page">
      {id && !tutorial ? (
        <>
          <div className="page-header">
            <div>
              <h1 className="page-title">Tutorial não encontrado</h1>
              <p className="page-subtitle">Esse tutorial não existe ou foi renomeado.</p>
            </div>
          </div>
          <Link to="/tutoriais" className="btn btn-secondary">Ver todos os tutoriais</Link>
        </>
      ) : tutorial ? (
        <DetalheTutorial tutorial={tutorial} user={user} onConcluir={concluir} />
      ) : (
        <ListaTutoriais lidos={lidos} user={user} />
      )}
    </div>
  );
}
