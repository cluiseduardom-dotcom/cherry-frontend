import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, GripVertical, Plus, Save, Settings2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buscarConfiguracaoSku, salvarConfiguracaoSku } from '../services/configuracoesSku';
import { listarNiveisCategoria } from '../services/niveisCategoria';
import './ConfiguracaoSku.css';

const EMPTY_CONFIG = {
  nome: 'Padrão',
  tipo_sku: 'numerico',
  separador: '-',
  prefixo: '',
  sufixo: '',
  tamanho_sequencia: 3,
  inicio_sequencia: 1,
  segmentos: [],
};

const TIPO_OPTIONS = [
  { value: 'alfanumerico', label: 'Alfanumérico', help: 'Permite letras e números na sequência.' },
  { value: 'numerico', label: 'Numérico', help: 'A sequência será composta somente por números.' },
  { value: 'alfabetico', label: 'Alfabético', help: 'A sequência será composta por letras (A, B, ..., AA).' },
];

function normalizeConfig(data) {
  if (!data) return { ...EMPTY_CONFIG, segmentos: [] };
  return {
    nome: data.nome ?? '',
    tipo_sku: data.tipo_sku ?? 'alfanumerico',
    separador: data.separador ?? '',
    prefixo: data.prefixo ?? '',
    sufixo: data.sufixo ?? '',
    tamanho_sequencia: Number(data.tamanho_sequencia ?? 3),
    inicio_sequencia: Number(data.inicio_sequencia ?? 1),
    segmentos: Array.isArray(data.segmentos)
      ? [...data.segmentos]
          .sort((a, b) => Number(a.ordem) - Number(b.ordem))
          .map(item => ({
            nivel: Number(item.nivel),
            ordem: Number(item.ordem),
            nome: item.nome ?? '',
            obrigatorio: item.obrigatorio !== false,
            participa_sku: item.participa_sku !== false,
          }))
      : [],
  };
}

export default function ConfiguracaoSku() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [niveis, setNiveis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const [configData, niveisData] = await Promise.all([
          buscarConfiguracaoSku(),
          listarNiveisCategoria(),
        ]);
        if (cancelled) return;
        setConfig(normalizeConfig(configData));
        setNiveis(Array.isArray(niveisData) ? niveisData : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const niveisDisponiveis = useMemo(() => {
    const usados = new Set(config.segmentos.map(item => Number(item.nivel)));
    return niveis
      .filter(nivel => !usados.has(Number(nivel)))
      .sort((a, b) => Number(a.nivel) - Number(b.nivel));
  }, [config.segmentos, niveis]);

  function setField(field, value) {
    setConfig(prev => ({ ...prev, [field]: value }));
    setSuccess('');
  }

  function updateSegmento(index, field, value) {
    setConfig(prev => ({
      ...prev,
      segmentos: prev.segmentos.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
    setSuccess('');
  }

  function addSegmento() {
    const nivel = niveisDisponiveis[0];
    if (!nivel) return;

    setConfig(prev => ({
      ...prev,
      segmentos: [
        ...prev.segmentos,
        {
          nivel: Number(nivel.nivel),
          ordem: prev.segmentos.length + 1,
          nome: nivel.nome || `Nível ${nivel.nivel}`,
          obrigatorio: true,
          participa_sku: true,
        },
      ],
    }));
    setSuccess('');
  }

  function removeSegmento(index) {
    setConfig(prev => ({
      ...prev,
      segmentos: prev.segmentos
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, ordem: i + 1 })),
    }));
    setSuccess('');
  }

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...config,
        tamanho_sequencia: Number(config.tamanho_sequencia),
        inicio_sequencia: Number(config.inicio_sequencia),
        separador: config.separador.slice(0, 1),
        prefixo: config.prefixo.trim(),
        sufixo: config.sufixo.trim(),
        segmentos: config.segmentos.map((item, index) => ({
          nivel: Number(item.nivel),
          ordem: index + 1,
          nome: String(item.nome || '').trim(),
          obrigatorio: Boolean(item.obrigatorio),
          participa_sku: Boolean(item.participa_sku),
        })),
      };

      const saved = await salvarConfiguracaoSku(payload);
      setConfig(normalizeConfig(saved));
      setSuccess('Configuração de SKU salva com sucesso.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const previewParts = [
    config.prefixo,
    ...config.segmentos
      .filter(item => item.participa_sku)
      .map(item => `CÓD${item.nivel}`),
    config.tipo_sku === 'alfabetico' ? 'AAA' : '001',
    config.sufixo,
  ].filter(Boolean);

  const preview = previewParts.join(config.separador || '');

  return (
    <div className="page-content">
      <div className="page-header configuracao-sku-header">
        <div>
          <button type="button" className="btn btn-ghost btn-sm configuracao-sku-back" onClick={() => navigate('/configuracoes')}>
            <ArrowLeft size={15} />
            Configurações
          </button>
          <h1 className="page-title">Configuração de SKU</h1>
          <p className="page-subtitle">Defina como o VERTUMNO gera novos SKUs para esta empresa.</p>
        </div>
        <button type="submit" form="configuracao-sku-form" className="btn btn-primary" disabled={loading || saving}>
          <Save size={16} />
          {saving ? 'Salvando...' : 'Salvar configuração'}
        </button>
      </div>

      {error && <div className="configuracao-sku-feedback configuracao-sku-feedback--error">{error}</div>}
      {success && <div className="configuracao-sku-feedback configuracao-sku-feedback--success">{success}</div>}

      {loading ? (
        <div className="empty-state"><p className="text-sm text-secondary">Carregando configuração...</p></div>
      ) : (
        <form id="configuracao-sku-form" onSubmit={handleSave} className="configuracao-sku-layout">
          <div className="configuracao-sku-main">
            <section className="card configuracao-sku-section">
              <div className="configuracao-sku-section-title">
                <Settings2 size={18} />
                <div>
                  <h2>Formato geral</h2>
                  <p>Essas regras valem para os SKUs gerados a partir de novas categorizações.</p>
                </div>
              </div>

              <div className="configuracao-sku-grid">
                <div className="input-wrapper configuracao-sku-full">
                  <label className="input-label">Nome da configuração *</label>
                  <input className="input-field" value={config.nome} onChange={e => setField('nome', e.target.value)} maxLength={100} required />
                </div>

                <div className="input-wrapper">
                  <label className="input-label">Tipo da sequência *</label>
                  <select className="input-field" value={config.tipo_sku} onChange={e => setField('tipo_sku', e.target.value)}>
                    {TIPO_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <span className="configuracao-sku-help">
                    {TIPO_OPTIONS.find(option => option.value === config.tipo_sku)?.help}
                  </span>
                </div>

                <div className="input-wrapper">
                  <label className="input-label">Separador</label>
                  <input className="input-field" value={config.separador} onChange={e => setField('separador', e.target.value.slice(0, 1))} maxLength={1} placeholder="Ex.: -" />
                  <span className="configuracao-sku-help">Um único caractere. Deixe vazio para concatenar.</span>
                </div>

                <div className="input-wrapper">
                  <label className="input-label">Prefixo</label>
                  <input className="input-field" value={config.prefixo} onChange={e => setField('prefixo', e.target.value)} maxLength={30} placeholder="Ex.: CH" />
                </div>

                <div className="input-wrapper">
                  <label className="input-label">Sufixo</label>
                  <input className="input-field" value={config.sufixo} onChange={e => setField('sufixo', e.target.value)} maxLength={30} placeholder="Ex.: V1" />
                </div>

                <div className="input-wrapper">
                  <label className="input-label">Tamanho da sequência *</label>
                  <input className="input-field" type="number" min="1" max="9" value={config.tamanho_sequencia} onChange={e => setField('tamanho_sequencia', e.target.value)} required />
                  <span className="configuracao-sku-help">Quantidade mínima de posições reservadas para a sequência.</span>
                </div>

                <div className="input-wrapper">
                  <label className="input-label">Início da sequência *</label>
                  <input className="input-field" type="number" min="0" value={config.inicio_sequencia} onChange={e => setField('inicio_sequencia', e.target.value)} required />
                </div>
              </div>
            </section>

            <section className="card configuracao-sku-section">
              <div className="configuracao-sku-section-title">
                <GripVertical size={18} />
                <div>
                  <h2>Segmentos do SKU</h2>
                  <p>Escolha quais níveis de categoria participam da composição do código e em qual ordem.</p>
                </div>
              </div>

              {config.segmentos.length === 0 ? (
                <div className="configuracao-sku-empty-segmentos">
                  <p>Nenhum segmento configurado.</p>
                  <span>Sem segmentos, o SKU será formado pelo prefixo, sequência e sufixo.</span>
                </div>
              ) : (
                <div className="configuracao-sku-segmentos">
                  {config.segmentos.map((segmento, index) => (
                    <div className="configuracao-sku-segmento" key={segmento.nivel}>
                      <div className="configuracao-sku-segmento-order">{index + 1}</div>

                      <div className="configuracao-sku-segmento-main">
                        <div className="configuracao-sku-segmento-fields">
                          <div className="input-wrapper">
                            <label className="input-label">Nível</label>
                            <select className="input-field" value={segmento.nivel} onChange={e => updateSegmento(index, 'nivel', Number(e.target.value))}>
                              <option value={segmento.nivel}>Nível {segmento.nivel}{niveis.find(n => Number(n.nivel) === Number(segmento.nivel))?.nome ? ` — ${niveis.find(n => Number(n.nivel) === Number(segmento.nivel)).nome}` : ''}</option>
                              {niveisDisponiveis.map(nivel => (
                                <option key={nivel.nivel} value={nivel.nivel}>Nível {nivel.nivel}{nivel.nome ? ` — ${nivel.nome}` : ''}</option>
                              ))}
                            </select>
                          </div>

                          <div className="input-wrapper">
                            <label className="input-label">Nome no SKU</label>
                            <input className="input-field" value={segmento.nome} onChange={e => updateSegmento(index, 'nome', e.target.value)} maxLength={255} />
                          </div>
                        </div>

                        <div className="configuracao-sku-toggles">
                          <label><input type="checkbox" checked={segmento.obrigatorio} onChange={e => updateSegmento(index, 'obrigatorio', e.target.checked)} /> Obrigatório</label>
                          <label><input type="checkbox" checked={segmento.participa_sku} onChange={e => updateSegmento(index, 'participa_sku', e.target.checked)} /> Participa do SKU</label>
                        </div>
                      </div>

                      <button type="button" className="configuracao-sku-remove" onClick={() => removeSegmento(index)} aria-label="Remover segmento" title="Remover segmento">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button type="button" className="btn btn-secondary" onClick={addSegmento} disabled={!niveisDisponiveis.length}>
                <Plus size={16} />
                Adicionar nível
              </button>
              {!niveisDisponiveis.length && niveis.length > 0 && (
                <span className="configuracao-sku-help">Todos os níveis disponíveis já estão configurados.</span>
              )}
              {!niveis.length && (
                <span className="configuracao-sku-help">Cadastre níveis em Configurações → Categorias de produto antes de adicioná-los aqui.</span>
              )}
            </section>
          </div>

          <aside className="configuracao-sku-preview card">
            <div className="configuracao-sku-preview-label">Pré-visualização</div>
            <div className="configuracao-sku-preview-value">{preview || '001'}</div>
            <p>Exemplo visual. Os códigos reais das categorias serão usados quando o produto for categorizado.</p>

            <div className="configuracao-sku-preview-list">
              <div><span>Prefixo</span><strong>{config.prefixo || '—'}</strong></div>
              <div><span>Segmentos</span><strong>{config.segmentos.filter(item => item.participa_sku).length}</strong></div>
              <div><span>Sequência</span><strong>{config.tipo_sku === 'alfabetico' ? 'AAA' : String(config.inicio_sequencia).padStart(Number(config.tamanho_sequencia) || 1, '0')}</strong></div>
              <div><span>Sufixo</span><strong>{config.sufixo || '—'}</strong></div>
            </div>
          </aside>
        </form>
      )}
    </div>
  );
}
