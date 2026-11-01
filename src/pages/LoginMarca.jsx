import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../theme/themeContext';
import { buscarMarcaPublica, esquecerMarca, lembrarMarca } from '../services/marca';
import { TEMA_PADRAO } from '../theme/themes';
import Login from './Login';

// /c/<slug>: tela de login com a identidade do cliente. A marca vem do backend (só o tema, sem
// login); enquanto consulta nada é desenhado, para não piscar a marca errada. Endereço desconhecido
// volta para /login (padrão VERTUMNO) e esquece a marca lembrada; falha de rede apenas volta.
export default function LoginMarca() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const { definirTemaBase } = useTheme();
  // Resultado da consulta, amarrado ao slug consultado (outro slug = ainda carregando).
  const [resultado, setResultado] = useState({ slug: null, estado: 'carregando' });

  useEffect(() => {
    let cancelado = false;
    buscarMarcaPublica(slug).then(marca => {
      if (cancelado) return;
      if (marca) {
        definirTemaBase(marca.tema);
        lembrarMarca(marca);
        setResultado({ slug, estado: 'ok' });
        return;
      }
      if (marca === null) {
        esquecerMarca();
        definirTemaBase(TEMA_PADRAO);
      }
      setResultado({ slug, estado: 'fora' });
    });

    return () => { cancelado = true; };
  }, [slug, definirTemaBase]);

  const estado = resultado.slug === slug ? resultado.estado : 'carregando';

  if (isAuthenticated) return <Login />;
  if (estado === 'fora') return <Navigate to="/login" replace />;
  if (estado === 'carregando') return <div className="login-page login-page--carregando" aria-busy="true" />;
  return <Login />;
}
