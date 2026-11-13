import { Component, Suspense } from 'react';
import './TelaSobDemanda.css';

// Cada tela é baixada só quando aberta (code-splitting). Dois estados novos que isso cria:
//  - enquanto o arquivo da tela chega: mensagem de carregamento;
//  - se o arquivo não chegar (sem rede, ou o sistema foi atualizado e o arquivo antigo não existe mais): em vez de
//    tela em branco, aviso com botão para recarregar a página.
class FalhaAoCarregarTela extends Component {
  state = { falhou: false };

  static getDerivedStateFromError() {
    return { falhou: true };
  }

  componentDidCatch(erro) {
    // Sem dado pessoal: só o tipo/mensagem técnica do erro de carregamento.
    console.error('Falha ao carregar a tela:', erro?.message);
  }

  render() {
    if (!this.state.falhou) return this.props.children;

    return (
      <div className="tela-sob-demanda tela-sob-demanda--falha" role="alert">
        <p>Não foi possível abrir esta tela. Pode ser a conexão ou uma atualização do sistema.</p>
        <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>Recarregar a página</button>
      </div>
    );
  }
}

export default function TelaSobDemanda({ children }) {
  return (
    <FalhaAoCarregarTela>
      <Suspense fallback={<div className="tela-sob-demanda" role="status" aria-live="polite">Carregando…</div>}>
        {children}
      </Suspense>
    </FalhaAoCarregarTela>
  );
}
