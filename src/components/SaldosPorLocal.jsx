import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { saldosPorLocalDoProduto } from '../services/locaisEstoque';
import { saldosComEstoque } from '../utils/locaisEstoque';
import './SaldosPorLocal.css';

/**
 * Quebra do estoque total de um produto por local (Central, maletas...), carregada ao abrir.
 * O total do card é a soma de todos os locais; aqui se vê onde o estoque está.
 */
export default function SaldosPorLocal({ produtoId }) {
  const [aberto, setAberto] = useState(false);
  const [locais, setLocais] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  async function alternar(e) {
    e.stopPropagation();
    const abrir = !aberto;
    setAberto(abrir);
    if (!abrir || locais) return;

    setCarregando(true);
    setErro('');
    try {
      const dados = await saldosPorLocalDoProduto(produtoId);
      setLocais(saldosComEstoque(dados.locais));
    } catch (err) {
      setErro(err.message || 'Não foi possível carregar os locais.');
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="saldos-por-local">
      <button type="button" className="saldos-por-local-toggle" onClick={alternar} aria-expanded={aberto}>
        Por local
        <ChevronDown size={14} className={aberto ? 'saldos-por-local-seta--aberta' : ''} />
      </button>
      {aberto && (
        <div className="saldos-por-local-lista">
          {carregando && <span className="saldos-por-local-msg">Carregando...</span>}
          {erro && <span className="saldos-por-local-msg saldos-por-local-msg--erro">{erro}</span>}
          {locais && locais.length === 0 && <span className="saldos-por-local-msg">Sem saldo em nenhum local.</span>}
          {locais && locais.map(l => (
            <div key={l.local_id} className="saldos-por-local-linha">
              <span>{l.rotulo}</span>
              <strong>{l.saldo}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
