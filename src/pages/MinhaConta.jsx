import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import FotoPerfilEditor from '../components/FotoPerfilEditor';
import { enviarMinhaFoto, removerMinhaFoto } from '../services/usuarioFotos';

// Minha conta: cada usuário (qualquer cargo) troca a própria foto de perfil.
export default function MinhaConta() {
  const { user, atualizarFoto } = useAuth();
  const toast = useToast();

  function aoAlterar(fotoUrl) {
    atualizarFoto(fotoUrl);
    toast.success(fotoUrl ? 'Foto atualizada.' : 'Foto removida.');
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Minha foto</h1>
          <p className="page-subtitle">Aparece no menu e na lista de usuários da sua empresa.</p>
        </div>
      </div>

      <div className="card card-padding" style={{ maxWidth: 560 }}>
        <FotoPerfilEditor
          nome={user?.nome}
          fotoUrl={user?.foto_url}
          enviar={enviarMinhaFoto}
          remover={removerMinhaFoto}
          onAlterada={aoAlterar}
        />
      </div>
    </div>
  );
}
