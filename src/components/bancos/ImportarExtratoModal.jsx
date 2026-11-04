import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { importarExtrato, previaExtrato } from '../../services/bancos';
import {
  TAMANHO_MAXIMO_EXTRATO, decodificarExtrato, resumoTexto, situacaoLinhaExtrato, totalAImportar,
} from '../../utils/bancos';
import { formatarMoeda } from '../../utils/mascaras';
import { formatarData } from '../../utils/formatarData';
import '../ProductModal.css';

export default function ImportarExtratoModal({ open, contas, contaInicialId, onClose, onImportado }) {
  const [contaId, setContaId] = useState('');
  const [conteudo, setConteudo] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState('');
  const [previa, setPrevia] = useState(null);
  const [incluidas, setIncluidas] = useState(new Set());
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const entradaArquivo = useRef(null);

  useEffect(() => {
    if (open) {
      setContaId(contaInicialId ? String(contaInicialId) : '');
      setConteudo(''); setNomeArquivo(''); setPrevia(null); setIncluidas(new Set()); setErro(''); setOcupado(false);
    }
  }, [open, contaInicialId]);

  if (!open) return null;
  const ativas = (contas ?? []).filter(c => c.status === 'ATIVA');
  const aImportar = totalAImportar(previa?.linhas, incluidas);

  async function gerarPrevia(conta, texto) {
    if (!conta || !texto) return;
    setErro(''); setOcupado(true); setPrevia(null); setIncluidas(new Set());
    try {
      setPrevia(await previaExtrato({ conta_bancaria_id: Number(conta), conteudo: texto }));
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  async function aoEscolherArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO_EXTRATO) {
      setErro('Arquivo grande demais (máximo 3 MB). Exporte um período menor.');
      return;
    }
    const texto = decodificarExtrato(await arquivo.arrayBuffer());
    setNomeArquivo(arquivo.name); setConteudo(texto);
    gerarPrevia(contaId, texto);
  }

  function aoMudarConta(valor) {
    setContaId(valor);
    if (conteudo) gerarPrevia(valor, conteudo);
  }

  function alternar(ref) {
    setIncluidas(prev => {
      const novo = new Set(prev);
      if (novo.has(ref)) novo.delete(ref); else novo.add(ref);
      return novo;
    });
  }

  async function confirmar() {
    setErro(''); setOcupado(true);
    try {
      const r = await importarExtrato({
        conta_bancaria_id: Number(contaId),
        conteudo,
        incluir_possiveis_duplicados: [...incluidas],
      });
      onImportado(r);
    } catch (err) {
      setErro(err.message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => e.target === e.currentTarget && !ocupado && onClose()}>
      <div className="modal-panel card" style={{ maxWidth: 900, width: '95vw' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Importar extrato</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        <div className="modal-body">
          {erro && <div className="modal-error">{erro}</div>}
          <div className="modal-form-grid">
            <div className="input-wrapper">
              <label className="input-label" htmlFor="ie-conta">Conta *</label>
              <select id="ie-conta" className="input-field" value={contaId} onChange={e => aoMudarConta(e.target.value)}>
                <option value="">Selecione...</option>
                {ativas.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div className="input-wrapper">
              <label className="input-label" htmlFor="ie-arquivo">Arquivo OFX ou CSV *</label>
              <input id="ie-arquivo" ref={entradaArquivo} type="file" accept=".ofx,.csv,.txt" className="input-field" disabled={!contaId || ocupado} onChange={aoEscolherArquivo} />
              {!contaId && <span className="bancos-field-error" style={{ color: 'inherit' }}>Escolha a conta primeiro.</span>}
            </div>
          </div>
          <p className="text-sm text-secondary">
            Nada é gravado até você confirmar. Lançamentos importados entram como &quot;Extrato&quot; e reimportar o mesmo
            arquivo não duplica. CSV: colunas Data, Descrição e Valor (ou Crédito e Débito).
          </p>

          {ocupado && !previa && <p className="text-sm text-secondary">Lendo o arquivo...</p>}

          {previa && (
            <>
              <p className="text-sm"><strong>{nomeArquivo}</strong> ({previa.formato}) — {resumoTexto(previa.resumo)}</p>
              {previa.erros.length > 0 && (
                <details className="text-sm">
                  <summary>{previa.erros.length} linha(s) ilegível(is), não serão importadas</summary>
                  <ul>{previa.erros.slice(0, 50).map(e => <li key={`${e.linha}-${e.erro}`}>Linha {e.linha}: {e.erro}</li>)}</ul>
                </details>
              )}
              {previa.resumo.possiveis_duplicadas > 0 && (
                <p className="text-sm">
                  <strong>Possível duplicado</strong> = já existe um lançamento manual ou do Mercado Pago de mesmo valor nesta
                  conta em até 1 dia. Por padrão não é importado; marque só se for outro lançamento de fato.
                </p>
              )}
              <div className="table-scroll" style={{ maxHeight: 340, overflow: 'auto' }}>
                <table className="contas-table">
                  <thead><tr><th></th><th>Data</th><th>Descrição</th><th>Valor</th><th>Situação</th></tr></thead>
                  <tbody>
                    {previa.linhas.map(l => {
                      const sit = situacaoLinhaExtrato(l.situacao);
                      return (
                        <tr key={l.referencia_externa} className="contas-row">
                          <td>
                            {l.situacao === 'possivel_duplicado' && (
                              <input type="checkbox" aria-label="Importar mesmo assim" checked={incluidas.has(l.referencia_externa)} onChange={() => alternar(l.referencia_externa)} />
                            )}
                          </td>
                          <td className="contas-date">{formatarData(l.data)}</td>
                          <td>{l.descricao}</td>
                          <td className={l.tipo === 'ENTRADA' ? 'bancos-entrada' : 'bancos-saida'}>
                            {l.tipo === 'ENTRADA' ? '+' : '−'} {formatarMoeda(l.valor)}
                          </td>
                          <td><span className={`badge ${sit.classe}`}>{sit.rotulo}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={ocupado}>Cancelar</button>
          <button type="button" className="btn btn-primary" onClick={confirmar} disabled={ocupado || !previa || aImportar === 0}>
            {ocupado && previa ? 'Importando...' : `Importar ${aImportar} lançamento(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}
