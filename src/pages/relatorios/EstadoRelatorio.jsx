/** Mostra carregando / erro; quando há dados, renderiza os filhos. */
export default function EstadoRelatorio({ carregando, erro, nome, children }) {
  if (carregando) {
    return <div className="empty-state"><p className="text-sm text-secondary">Carregando {nome}...</p></div>;
  }
  if (erro) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Não foi possível carregar {nome}</div>
        <p className="text-sm text-secondary">{erro}</p>
      </div>
    );
  }
  return children ?? null;
}
