import { GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { caminhoDoTutorial } from '../utils/tutoriais';
import './AjudaContextual.css';

/**
 * Faixa curta no topo de uma tela difícil: explica a ideia em uma frase e leva ao tutorial completo.
 * Sem estado e sem chamada de API.
 */
export default function AjudaContextual({ titulo, texto, tutorialId, rotuloLink = 'Ver o passo a passo' }) {
  return (
    <aside className="ajuda-contextual" aria-label="Ajuda desta tela">
      <span className="ajuda-contextual-icone" aria-hidden="true"><GraduationCap size={18} /></span>
      <div className="ajuda-contextual-corpo">
        {titulo && <strong className="ajuda-contextual-titulo">{titulo}</strong>}
        <span className="ajuda-contextual-texto">{texto}</span>
      </div>
      <Link to={caminhoDoTutorial(tutorialId)} className="btn btn-ghost btn-sm ajuda-contextual-link">
        {rotuloLink}
      </Link>
    </aside>
  );
}
