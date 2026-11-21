import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { aplicarModeloNicho, listarModelosNicho } from '../services/modelosNicho';
import { mensagemDeConfirmacao, modeloPorId } from '../utils/modelosNicho';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../context/ToastContext';
import './ModelosNichoCard.css';

/**
 * Para empresa sem categoria de produto: oferece modelos prontos (níveis, categorias e padrão de SKU de partida).
 * Aplicar é uma ação única; depois a empresa edita tudo nas telas de sempre.
 */
export default function ModelosNichoCard({ onAplicado }) {
  const toast = useToast();
  const [modelos, setModelos] = useState([]);
  const [escolhido, setEscolhido] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [aplicando, setAplicando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    listarModelosNicho()
      .then(lista => { if (!cancelado) setModelos(Array.isArray(lista) ? lista : []); })
      .catch(() => { /* sem modelos, o cartão simplesmente não aparece */ });
    return () => { cancelado = true; };
  }, []);

  if (modelos.length === 0) return null;

  const modelo = modeloPorId(modelos, escolhido);

  async function aplicar() {
    setAplicando(true);
    try {
      await aplicarModeloNicho(escolhido);
      toast.success('Modelo aplicado. Você já pode categorizar seus produtos.');
      setConfirmando(false);
      onAplicado?.();
    } catch (err) {
      setConfirmando(false);
      toast.error(err.message);
    } finally {
      setAplicando(false);
    }
  }

  return (
    <section className="modelos-nicho card card-padding" aria-label="Modelos prontos">
      <h2 className="section-title"><Sparkles size={16} aria-hidden="true" /> Comece por um modelo pronto</h2>
      <p className="text-sm text-secondary">
        Em vez de criar tudo do zero, escolha o tipo do seu negócio. Criamos as categorias e o formato do SKU para você;
        depois dá para renomear, adicionar e remover o que quiser.
      </p>

      <div className="modelos-nicho-lista" role="radiogroup" aria-label="Tipo de negócio">
        {modelos.map(m => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={escolhido === m.id}
            className={`modelos-nicho-opcao${escolhido === m.id ? ' modelos-nicho-opcao--ativa' : ''}`}
            onClick={() => setEscolhido(m.id)}
          >
            <span className="modelos-nicho-nome">{m.nome}</span>
            <span className="modelos-nicho-desc">{m.descricao}</span>
            <span className="modelos-nicho-sku">SKU de exemplo: <strong>{m.exemplo_sku}</strong></span>
          </button>
        ))}
      </div>

      {modelo && (
        <div className="modelos-nicho-previa">
          {modelo.niveis.map(n => (
            <div key={n.nivel}>
              <strong>{n.nome}:</strong>{' '}
              {n.categorias.map(c => <span key={c.codigo} className="badge badge-info modelos-nicho-chip">{c.codigo} · {c.nome}</span>)}
            </div>
          ))}
        </div>
      )}

      <div className="modelos-nicho-acoes">
        <button type="button" className="btn btn-primary" disabled={!modelo || aplicando} onClick={() => setConfirmando(true)}>
          Usar este modelo
        </button>
      </div>

      <ConfirmDialog
        open={confirmando}
        title={`Aplicar o modelo "${modelo?.nome ?? ''}"?`}
        message={mensagemDeConfirmacao(modelo)}
        confirmLabel={aplicando ? 'Aplicando…' : 'Aplicar modelo'}
        tone="info"
        onConfirm={aplicar}
        onCancel={() => !aplicando && setConfirmando(false)}
      />
    </section>
  );
}
