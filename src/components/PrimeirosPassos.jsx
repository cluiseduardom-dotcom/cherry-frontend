import { useEffect, useState } from 'react';
import { Check, Circle, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { listarCategorias } from '../services/categorias';
import { listarProdutos } from '../services/produtos';
import { listarVendas } from '../services/vendas';
import {
  caminhoDoTutorial,
  checklistOculto,
  ocultarChecklist,
  passosPrimeirosPassos,
  resumoChecklist,
} from '../utils/tutoriais';
import './PrimeirosPassos.css';

// Cada sinal vem de uma lista que o sistema já tem. Falha de rede = null (o passo fica pendente, sem mentir).
async function lerSinais() {
  const seguro = fn => fn().catch(() => null);
  const [categorias, produtos, vendas] = await Promise.all([
    seguro(() => listarCategorias({ page: 1, pageSize: 1 })),
    seguro(() => listarProdutos({ page: 1, pageSize: 100 })),
    seguro(() => listarVendas({ page: 1, pageSize: 1 })),
  ]);

  const itensProdutos = Array.isArray(produtos?.items) ? produtos.items : null;
  return {
    categorias: categorias ? Number(categorias.total ?? categorias.items?.length ?? 0) : null,
    produtos: produtos ? Number(produtos.total ?? itensProdutos?.length ?? 0) : null,
    produtosComSku: itensProdutos ? itensProdutos.filter(p => p.sku).length : null,
    vendas: vendas ? Number(vendas.total ?? vendas.items?.length ?? 0) : null,
  };
}

/**
 * Checklist de primeiros passos do administrador. Some sozinho quando tudo está feito e pode ser dispensado
 * (preferência guardada só neste navegador).
 */
export default function PrimeirosPassos() {
  const [oculto, setOculto] = useState(() => checklistOculto());
  const [sinais, setSinais] = useState(null);

  useEffect(() => {
    if (oculto) return undefined;
    let cancelado = false;
    lerSinais().then(dados => {
      if (!cancelado) setSinais(dados);
    });
    return () => {
      cancelado = true;
    };
  }, [oculto]);

  if (oculto || !sinais) return null;

  const passos = passosPrimeirosPassos(sinais);
  const { feitos, total, completo } = resumoChecklist(passos);
  if (completo) return null;

  function dispensar() {
    ocultarChecklist();
    setOculto(true);
  }

  return (
    <section className="primeiros-passos card card-padding" aria-label="Primeiros passos">
      <div className="primeiros-passos-topo">
        <div>
          <h2 className="section-title">Primeiros passos</h2>
          <p className="primeiros-passos-sub">{feitos} de {total} concluídos</p>
        </div>
        <button type="button" className="produto-action-btn" onClick={dispensar} aria-label="Dispensar primeiros passos">
          <X size={16} />
        </button>
      </div>
      <ul className="primeiros-passos-lista">
        {passos.map(passo => (
          <li key={passo.id} className={`primeiros-passos-item${passo.concluido ? ' primeiros-passos-item--feito' : ''}`}>
            <span className="primeiros-passos-marca" aria-hidden="true">
              {passo.concluido ? <Check size={15} /> : <Circle size={15} />}
            </span>
            <span className="primeiros-passos-texto">
              <span className="primeiros-passos-titulo">{passo.titulo}</span>
              <span className="primeiros-passos-ajuda">{passo.ajuda}</span>
            </span>
            {!passo.concluido && (
              <span className="primeiros-passos-acoes">
                <Link to={caminhoDoTutorial(passo.tutorial)} className="btn btn-ghost btn-sm">Como fazer</Link>
                <Link to={passo.rota} className="btn btn-secondary btn-sm">Abrir</Link>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
