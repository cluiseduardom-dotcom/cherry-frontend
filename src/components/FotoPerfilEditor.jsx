import { useRef, useState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import Avatar from './Avatar';
import FotoRecorte from './FotoRecorte';
import ConfirmDialog from './ConfirmDialog';
import { useConfirmAction } from '../hooks/useConfirmAction';
import { TIPOS_ACEITOS, validarArquivoFoto } from '../utils/fotoProduto';
import './FotoPerfilEditor.css';

// Parte visual, sem efeitos: recebe tudo por props (testável sem DOM).
export function FotoPerfilPainel({ nome, fotoUrl, ocupado, erro, onEscolher, onRemover, inputRef, onArquivo }) {
  return (
    <div className="foto-perfil">
      {erro && <div className="modal-error" role="alert">{erro}</div>}
      <div className="foto-perfil-linha">
        <Avatar nome={nome} fotoUrl={fotoUrl} className="foto-perfil-avatar" vazio="U" />
        <div className="foto-perfil-acoes">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onEscolher} disabled={ocupado}>
            <Camera size={14} aria-hidden="true" /> {fotoUrl ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          {fotoUrl && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onRemover} disabled={ocupado}>
              <Trash2 size={14} aria-hidden="true" /> Remover foto
            </button>
          )}
          <span className="campo-dica">JPEG, PNG ou WebP. A foto é recortada em formato quadrado antes de enviar.</span>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={TIPOS_ACEITOS.join(',')}
        className="foto-perfil-input"
        onChange={onArquivo}
        tabIndex={-1}
        aria-hidden="true"
      />
    </div>
  );
}

/**
 * Editor da foto de perfil: escolhe o arquivo, recorta e envia. Quem usa define COMO enviar e remover
 * (a própria foto ou a de outro usuário): `enviar(File)` e `remover()` devolvem `{ foto_url }`.
 * `onAlterada(foto_url)` avisa a tela depois de gravar.
 */
export default function FotoPerfilEditor({ nome, fotoUrl, enviar, remover, onAlterada }) {
  const [arquivo, setArquivo] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const inputRef = useRef(null);
  const { acaoPendente, pedirConfirmacao, confirmar, cancelar } = useConfirmAction();

  function aoEscolherArquivo(e) {
    const escolhido = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!escolhido) return;

    const problema = validarArquivoFoto(escolhido);
    if (problema) {
      setErro(problema);
      return;
    }

    setErro('');
    setArquivo(escolhido);
  }

  async function aoConfirmarRecorte(recortada) {
    setErro('');
    setOcupado(true);
    try {
      const resultado = await enviar(recortada);
      setArquivo(null);
      onAlterada?.(resultado?.foto_url ?? null);
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function removerFoto() {
    setErro('');
    setOcupado(true);
    try {
      await remover();
      onAlterada?.(null);
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      {arquivo ? (
        <>
          {erro && <div className="modal-error" role="alert">{erro}</div>}
          <FotoRecorte arquivo={arquivo} ocupado={ocupado} onConfirmar={aoConfirmarRecorte} onCancelar={() => setArquivo(null)} />
        </>
      ) : (
        <FotoPerfilPainel
          nome={nome}
          fotoUrl={fotoUrl}
          ocupado={ocupado}
          erro={erro}
          inputRef={inputRef}
          onArquivo={aoEscolherArquivo}
          onEscolher={() => inputRef.current?.click()}
          onRemover={() => pedirConfirmacao({
            title: 'Remover a foto?',
            message: 'O usuário volta a aparecer com as iniciais. Você pode enviar outra foto quando quiser.',
            confirmLabel: 'Remover',
            tone: 'danger',
            execute: removerFoto,
          })}
        />
      )}
      <ConfirmDialog
        open={acaoPendente !== null}
        title={acaoPendente?.title}
        message={acaoPendente?.message}
        confirmLabel={acaoPendente?.confirmLabel}
        tone={acaoPendente?.tone}
        onConfirm={confirmar}
        onCancel={cancelar}
      />
    </>
  );
}
