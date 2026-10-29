import { useState } from 'react';
import { iniciaisDoNome } from '../utils/iniciais';
import './Avatar.css';

// Foto de perfil redonda; sem foto (ou se a imagem falhar ao carregar) mostra as iniciais.
// O tamanho e as cores vêm de quem usa (className); aqui só o recorte redondo e o fallback.
export default function Avatar({ nome, fotoUrl, className = '', vazio = '' }) {
  const [falhou, setFalhou] = useState(false);
  const mostrarFoto = Boolean(fotoUrl) && !falhou;

  return (
    <div className={`avatar ${className}`.trim()}>
      {mostrarFoto ? (
        <img
          className="avatar-img"
          src={fotoUrl}
          alt={nome ? `Foto de ${nome}` : 'Foto de perfil'}
          loading="lazy"
          onError={() => setFalhou(true)}
        />
      ) : (
        iniciaisDoNome(nome, vazio)
      )}
    </div>
  );
}
