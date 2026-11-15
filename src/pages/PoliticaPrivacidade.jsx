import { Link } from 'react-router-dom';
import { ATUALIZADA_EM, SECOES } from '../data/politicaPrivacidade';
import './PoliticaPrivacidade.css';

// Página pública (sem login, sem API): política de privacidade do sistema. O texto vive em src/data/politicaPrivacidade.js.
export default function PoliticaPrivacidade() {
  return (
    <main className="politica-privacidade">
      <article className="politica-privacidade-corpo">
        <p><Link to="/login">Voltar ao login</Link></p>
        <h1>Política de privacidade</h1>
        <p className="politica-privacidade-data">Sistema Vertumno · atualizada em {ATUALIZADA_EM}</p>

        {SECOES.map((secao) => (
          <section key={secao.titulo}>
            <h2>{secao.titulo}</h2>
            {secao.paragrafos?.map((p) => <p key={p}>{p}</p>)}
            {secao.lista && <ul>{secao.lista.map((item) => <li key={item}>{item}</li>)}</ul>}
          </section>
        ))}
      </article>
    </main>
  );
}
