import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Hash,
  Layers,
  Plus,
  Save,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  buscarConfiguracaoSku,
  listarPadroesSku,
  salvarConfiguracaoSku,
} from '../services/configuracoesSku';
import { listarNiveisCategoria } from '../services/niveisCategoria';
import { listarCategorias } from '../services/categorias';
import './ConfiguracaoSku.css';

export const SEPARADORES_PERMITIDOS = ['-', '_', '/', 'x', '*', '+'];

export const SEPARADORES_OPCOES = [
  { valor: '-', label: 'Hífen (-)', char: '-' },
  { valor: '_', label: 'Sublinhado (_)', char: '_' },
  { valor: '/', label: 'Barra (/)', char: '/' },
  { valor: 'x', label: 'Letra x', char: 'x' },
  { valor: '*', label: 'Asterisco (*)', char: '*' },
  { valor: '+', label: 'Mais (+)', char: '+' },
  { valor: '', label: 'Nenhum', char: '∅' },
];

export const TIPO_OPTIONS = [
  { value: 'numerico', label: 'Numérico', help: 'Apenas números sequenciais (ex.: 001, 002).' },
  { value: 'alfanumerico', label: 'Alfanumérico', help: 'Combinação de letras e números.' },
  { value: 'alfabetico', label: 'Alfabético', help: 'Sequência por letras (A, B, ..., AA).' },
];

export function normalizarPadrao(data) {
  if (!data) {
    return {
      nome: 'Novo Padrão',
      padrao: false,
      ativo: true,
      tipo_sku: 'numerico',
      separador: '-',
      prefixo: '',
      sufixo: '',
      tamanho_sequencia: 3,
      inicio_sequencia: 1,
      segmentos: [],
    };
  }

  return {
    id: data.id,
    nome: data.nome ?? '',
    padrao: Boolean(data.padrao),
    ativo: data.ativo !== false,
    tipo_sku: data.tipo_sku ?? 'numerico',
    separador: data.separador ?? '',
    prefixo: data.prefixo ?? '',
    sufixo: data.sufixo ?? '',
    tamanho_sequencia: Number(data.tamanho_sequencia ?? 3),
    inicio_sequencia: Number(data.inicio_sequencia ?? 1),
    segmentos: Array.isArray(data.segmentos)
      ? [...data.segmentos]
          .sort((a, b) => Number(a.ordem) - Number(b.ordem))
          .map((item, index) => ({
            nivel: Number(item.nivel),
            ordem: index + 1,
            nome: item.nome ?? '',
            obrigatorio: item.obrigatorio !== false,
            participa_sku: item.participa_sku !== false,
          }))
      : [],
  };
}

export function formatarSequenciaPreview(inicio = 1, tipo = 'numerico', tamanho = 3) {
  const tNum = Number(tamanho);
  const tam = Number.isFinite(tNum) ? Math.max(1, Math.min(18, Math.floor(tNum))) : 3;
  const num = BigInt(Math.max(0, Number(inicio) || 1));

  if (tipo === 'alfabetico') {
    let n = num < 1n ? 1n : num;
    let resultado = '';
    while (n > 0n) {
      n -= 1n;
      resultado = String.fromCharCode(65 + Number(n % 26n)) + resultado;
      n = n / 26n;
    }
    return resultado.padStart(tam, 'A');
  }

  return num.toString().padStart(tam, '0');
}

export function obterCodigoExemplo(segmento, index = 0, categorias = [], niveis = []) {
  if (!segmento) return 'EX';

  // 1. Verificar se existe categoria cadastrada no sistema para esse nível
  const categoriaNivel = categorias.find(c => Number(c.nivel) === Number(segmento.nivel));
  if (categoriaNivel?.codigo) {
    return String(categoriaNivel.codigo).toUpperCase();
  }

  // 2. Reconhecer termos clássicos (Família, Material, Público)
  const nomeLower = (segmento.nome || '').toLowerCase();
  const nivelRef = niveis.find(n => Number(n.nivel) === Number(segmento.nivel));
  const nivelNomeLower = (nivelRef?.nome || '').toLowerCase();

  if (nomeLower.includes('família') || nomeLower.includes('familia') || nivelNomeLower.includes('família') || nivelNomeLower.includes('familia')) {
    return 'CO';
  }
  if (nomeLower.includes('material') || nivelNomeLower.includes('material')) {
    return 'BO';
  }
  if (nomeLower.includes('público') || nomeLower.includes('publico') || nivelNomeLower.includes('público') || nivelNomeLower.includes('publico')) {
    return 'FE';
  }

  // 3. Gerar código representativo a partir do nome (normalizando acentos)
  const semAcento = (segmento.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const limpo = semAcento.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (limpo.length >= 2) {
    return limpo.slice(0, 2);
  }

  // 4. Fallback contextual
  const exemplosPadrao = ['CO', 'BO', 'FE', '01', 'BR'];
  return exemplosPadrao[index % exemplosPadrao.length] || `C${segmento.nivel}`;
}

export function montarPreviaSku(config, categorias = [], niveis = []) {
  if (!config) return '';

  const separador = config.separador ?? '';
  const prefixo = (config.prefixo || '').trim();
  const sufixo = (config.sufixo || '').trim();

  const codigosSegmentos = (config.segmentos || [])
    .filter(s => s.participa_sku)
    .map((s, idx) => obterCodigoExemplo(s, idx, categorias, niveis));

  const sequencia = formatarSequenciaPreview(
    config.inicio_sequencia,
    config.tipo_sku,
    config.tamanho_sequencia
  );

  const partes = [prefixo, ...codigosSegmentos, sequencia, sufixo].filter(Boolean);
  return partes.join(separador);
}

export function decomporSegmentosPreview(config, categorias = [], niveis = []) {
  if (!config) return [];

  const itens = [];

  if (config.prefixo) {
    itens.push({ rotulo: 'Prefixo', valor: config.prefixo });
  }

  (config.segmentos || [])
    .filter(s => s.participa_sku)
    .forEach((s, idx) => {
      itens.push({
        rotulo: s.nome || `Nível ${s.nivel}`,
        valor: obterCodigoExemplo(s, idx, categorias, niveis),
      });
    });

  const sequencia = formatarSequenciaPreview(
    config.inicio_sequencia,
    config.tipo_sku,
    config.tamanho_sequencia
  );
  itens.push({ rotulo: 'Sequência', valor: sequencia });

  if (config.sufixo) {
    itens.push({ rotulo: 'Sufixo', valor: config.sufixo });
  }

  return itens;
}

export function validarPadrao(config, outrosPadroes = []) {
  if (!config.nome?.trim()) {
    return 'Nome do padrão é obrigatório';
  }

  const nomeDuplicado = outrosPadroes.some(
    p => p.id !== config.id && p.nome?.trim().toLowerCase() === config.nome.trim().toLowerCase()
  );
  if (nomeDuplicado) {
    return 'Já existe um padrão cadastrado com este nome';
  }

  // Regra de Fallback: deve existir sempre pelo menos um padrão ativo como principal/fallback
  const isPadrao = config.padrao !== false;
  const outroFallbackExiste = outrosPadroes.some(
    p => p.id !== config.id && p.padrao && p.ativo !== false
  );

  if (!isPadrao && !outroFallbackExiste) {
    return 'A empresa deve possuir sempre pelo menos um padrão ativo definido como padrão principal/fallback. Para desmarcar este padrão, defina outro padrão como principal primeiro.';
  }

  if (config.separador && !SEPARADORES_PERMITIDOS.includes(config.separador)) {
    return 'Separador de SKU não permitido. Use: -, _, /, x, *, + ou deixe vazio.';
  }

  const tam = Number(config.tamanho_sequencia);
  if (!Number.isInteger(tam) || tam < 1 || tam > 18) {
    return 'Tamanho da sequência deve estar entre 1 e 18';
  }

  const inicio = Number(config.inicio_sequencia);
  if (!Number.isInteger(inicio) || inicio < 0) {
    return 'Início da sequência deve ser maior ou igual a zero';
  }

  return '';
}

export default function ConfiguracaoSku() {
  const navigate = useNavigate();

  const [padroes, setPadroes] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [config, setConfig] = useState(normalizarPadrao(null));

  const [niveis, setNiveis] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function carregarDados() {
      setLoading(true);
      setError('');
      try {
        const [padroesData, niveisData, categoriasData] = await Promise.all([
          listarPadroesSku().catch(async () => {
            const fallback = await buscarConfiguracaoSku();
            return fallback ? [fallback] : [];
          }),
          listarNiveisCategoria(),
          listarCategorias({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        ]);

        if (cancelled) return;

        const listaNormalizada = Array.isArray(padroesData) && padroesData.length > 0
          ? padroesData.map(normalizarPadrao)
          : [normalizarPadrao({ nome: 'Padrão SemiJoias', padrao: true, separador: '-' })];

        setPadroes(listaNormalizada);
        setNiveis(Array.isArray(niveisData) ? niveisData : []);
        setCategorias(Array.isArray(categoriasData?.items) ? categoriasData.items : []);

        // Selecionar o padrão fallback ou o primeiro
        const padraoPrincipal = listaNormalizada.find(p => p.padrao) || listaNormalizada[0];
        setSelectedId(padraoPrincipal.id);
        setConfig({ ...padraoPrincipal });
      } catch (err) {
        if (!cancelled) setError(err.message || 'Erro ao carregar configurações de SKU');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    carregarDados();
    return () => { cancelled = true; };
  }, []);

  const niveisDisponiveis = useMemo(() => {
    const niveisEmUso = new Set(config.segmentos.map(item => Number(item.nivel)));
    return niveis
      .filter(n => !niveisEmUso.has(Number(n.nivel)))
      .sort((a, b) => Number(a.nivel) - Number(b.nivel));
  }, [config.segmentos, niveis]);

  const outroFallbackExiste = useMemo(() => {
    return padroes.some(p => p.id !== config.id && p.padrao && p.ativo !== false);
  }, [padroes, config.id]);

  const isUnicoFallback = Boolean(config.padrao) && !outroFallbackExiste;

  function handleSelectPadrao(padrao) {
    setIsCreatingNew(false);
    setSelectedId(padrao.id);
    setConfig({ ...padrao });
    setError('');
    setSuccess('');
  }

  function handleStartNewPadrao() {
    setIsCreatingNew(true);
    setSelectedId(null);

    // Sugerir segmentos iniciais baseados nos níveis cadastrados
    const segmentosIniciais = niveis.slice(0, 3).map((nivel, idx) => ({
      nivel: Number(nivel.nivel),
      ordem: idx + 1,
      nome: nivel.nome || `Nível ${nivel.nivel}`,
      obrigatorio: true,
      participa_sku: true,
    }));

    setConfig({
      nome: '',
      padrao: padroes.length === 0,
      ativo: true,
      tipo_sku: 'numerico',
      separador: '-',
      prefixo: '',
      sufixo: '',
      tamanho_sequencia: 3,
      inicio_sequencia: 1,
      segmentos: segmentosIniciais,
    });
    setError('');
    setSuccess('');
  }

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
    const segmentoRemovido = config.segmentos[index];
    if (segmentoRemovido?.obrigatorio) {
      const confirma = window.confirm(
        `O segmento "${segmentoRemovido.nome}" está marcado como obrigatório. Deseja realmente removê-lo da composição?`
      );
      if (!confirma) return;
    }

    setConfig(prev => ({
      ...prev,
      segmentos: prev.segmentos
        .filter((_, i) => i !== index)
        .map((item, i) => ({ ...item, ordem: i + 1 })),
    }));
    setSuccess('');
  }

  function moverSegmento(index, direcao) {
    const novaLista = [...config.segmentos];
    const targetIndex = direcao === 'up' ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= novaLista.length) return;

    const [removido] = novaLista.splice(index, 1);
    novaLista.splice(targetIndex, 0, removido);

    setConfig(prev => ({
      ...prev,
      segmentos: novaLista.map((item, i) => ({ ...item, ordem: i + 1 })),
    }));
    setSuccess('');
  }

  async function handleSave(event) {
    event.preventDefault();

    const validationError = validarPadrao(config, padroes);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...(config.id ? { id: config.id } : {}),
        nome: config.nome.trim(),
        padrao: Boolean(config.padrao),
        tipo_sku: config.tipo_sku,
        separador: config.separador ? config.separador.slice(0, 1) : '',
        prefixo: (config.prefixo || '').trim().slice(0, 30),
        sufixo: (config.sufixo || '').trim().slice(0, 30),
        tamanho_sequencia: Number(config.tamanho_sequencia),
        inicio_sequencia: Number(config.inicio_sequencia),
        segmentos: config.segmentos.map((s, idx) => ({
          nivel: Number(s.nivel),
          ordem: idx + 1,
          nome: (s.nome || '').trim(),
          obrigatorio: Boolean(s.obrigatorio),
          participa_sku: Boolean(s.participa_sku),
        })),
      };

      const resposta = await salvarConfiguracaoSku(payload);

      let novaLista;
      if (Array.isArray(resposta)) {
        novaLista = resposta.map(normalizarPadrao);
      } else {
        novaLista = await listarPadroesSku().then(res => (Array.isArray(res) ? res.map(normalizarPadrao) : []));
      }

      setPadroes(novaLista);

      const salvoMatch = novaLista.find(
        p => (payload.id ? p.id === payload.id : p.nome.toLowerCase() === payload.nome.toLowerCase())
      ) || novaLista[0];

      if (salvoMatch) {
        setSelectedId(salvoMatch.id);
        setConfig({ ...salvoMatch });
        setIsCreatingNew(false);
      }

      setSuccess('Padrão salvo com sucesso.');
    } catch (err) {
      setError(err.message || 'Não foi possível salvar o padrão. Verifique os campos obrigatórios.');
    } finally {
      setSaving(false);
    }
  }

  const skuPreview = useMemo(
    () => montarPreviaSku(config, categorias, niveis),
    [config, categorias, niveis]
  );

  const previewItems = useMemo(
    () => decomporSegmentosPreview(config, categorias, niveis),
    [config, categorias, niveis]
  );

  return (
    <div className="page-content configuracao-sku-container">
      {/* Top Header */}
      <div className="page-header configuracao-sku-header">
        <div>
          <button
            type="button"
            className="btn btn-ghost btn-sm configuracao-sku-back"
            onClick={() => navigate('/configuracoes')}
          >
            <ArrowLeft size={15} />
            Configurações
          </button>
          <h1 className="page-title">Padrões de SKU</h1>
          <p className="page-subtitle">
            Configure múltiplos padrões de SKU para sua empresa e associe formatos diferentes por categoria de produto.
          </p>
        </div>

        <div className="configuracao-sku-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleStartNewPadrao}
            disabled={loading || saving}
          >
            <Plus size={16} />
            Novo padrão
          </button>
          <button
            type="submit"
            form="configuracao-sku-form"
            className="btn btn-primary"
            disabled={loading || saving}
          >
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar padrão'}
          </button>
        </div>
      </div>

      {/* Global Feedback */}
      {error && <div className="configuracao-sku-feedback configuracao-sku-feedback--error">{error}</div>}
      {success && <div className="configuracao-sku-feedback configuracao-sku-feedback--success">{success}</div>}

      {loading ? (
        <div className="empty-state">
          <p className="text-sm text-secondary">Carregando padrões de SKU...</p>
        </div>
      ) : (
        <div className="configuracao-sku-grid-layout">
          {/* Coluna 1: Lista de Padrões Cadastrados */}
          <aside className="configuracao-sku-sidebar">
            <div className="card configuracao-sku-padroes-card">
              <div className="configuracao-sku-padroes-header">
                <div>
                  <h2 className="configuracao-sku-padroes-title">Padrões cadastrados</h2>
                  <span className="configuracao-sku-padroes-count">
                    {padroes.length} {padroes.length === 1 ? 'padrão' : 'padrões'}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={handleStartNewPadrao}
                  title="Cadastrar novo padrão"
                >
                  <Plus size={15} />
                </button>
              </div>

              <div className="configuracao-sku-padroes-list">
                {padroes.map(p => {
                  const isSelected = !isCreatingNew && selectedId === p.id;
                  const previaPadrinho = montarPreviaSku(p, categorias, niveis);
                  return (
                    <button
                      key={p.id ?? p.nome}
                      type="button"
                      className={`configuracao-sku-item-card ${isSelected ? 'configuracao-sku-item-card--active' : ''}`}
                      onClick={() => handleSelectPadrao(p)}
                    >
                      <div className="configuracao-sku-item-top">
                        <strong className="configuracao-sku-item-name">{p.nome}</strong>
                        {p.padrao ? (
                          <span className="badge badge-primary configuracao-sku-badge-padrao">
                            ★ Padrão
                          </span>
                        ) : (
                          <span className="badge badge-success configuracao-sku-badge-ativo">
                            Ativo
                          </span>
                        )}
                      </div>

                      <div className="configuracao-sku-item-preview">
                        <code>{previaPadrinho || '001'}</code>
                      </div>

                      <div className="configuracao-sku-item-meta">
                        <span>Separador: <strong>{p.separador ? `"${p.separador}"` : 'Nenhum'}</strong></span>
                        <span>•</span>
                        <span>{p.segmentos?.length || 0} segmentos</span>
                      </div>
                    </button>
                  );
                })}

                {isCreatingNew && (
                  <div className="configuracao-sku-item-card configuracao-sku-item-card--active configuracao-sku-item-card--creating">
                    <div className="configuracao-sku-item-top">
                      <strong className="configuracao-sku-item-name">
                        {config.nome || 'Novo padrão (em edição)'}
                      </strong>
                      <span className="badge configuracao-sku-badge-draft">Rascunho</span>
                    </div>
                    <div className="configuracao-sku-item-preview">
                      <code>{skuPreview || '001'}</code>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Coluna 2: Formulário do Padrão Selecionado */}
          <main className="configuracao-sku-content">
            <form id="configuracao-sku-form" onSubmit={handleSave} className="configuracao-sku-form-layout">
              {/* Seção 1: Identificação e Formato Geral */}
              <section className="card configuracao-sku-section">
                <div className="configuracao-sku-section-title">
                  <Settings2 size={18} />
                  <div>
                    <h2>{isCreatingNew ? 'Novo padrão de SKU' : `Editando: ${config.nome}`}</h2>
                    <p>Identificação, separador e formato da sequência numérica ou alfabética.</p>
                  </div>
                </div>

                <div className="configuracao-sku-fields-grid">
                  <div className="input-wrapper configuracao-sku-col-2">
                    <label className="input-label" htmlFor="padrao-nome">Nome do padrão *</label>
                    <input
                      id="padrao-nome"
                      className="input-field"
                      placeholder="Ex.: Padrão SemiJoias"
                      value={config.nome}
                      onChange={e => setField('nome', e.target.value)}
                      maxLength={100}
                      required
                    />
                  </div>

                  <div className="input-wrapper configuracao-sku-col-2 configuracao-sku-fallback-box">
                    <label className="configuracao-sku-checkbox-label">
                      <input
                        type="checkbox"
                        checked={Boolean(config.padrao)}
                        disabled={isUnicoFallback}
                        onChange={e => setField('padrao', e.target.checked)}
                      />
                      <div>
                        <strong>Definir como padrão principal / fallback da empresa</strong>
                        <p>
                          {isUnicoFallback ? (
                            <span className="configuracao-sku-fallback-warning">
                              Este é atualmente o único padrão principal/fallback da empresa e não pode ser desmarcado diretamente. Para alterá-lo, defina outro padrão como principal primeiro.
                            </span>
                          ) : (
                            'Quando nenhuma categoria vinculada ao produto possuir padrão específico, este padrão será utilizado automaticamente.'
                          )}
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* Seleção de Separador Visual */}
                  <div className="input-wrapper configuracao-sku-col-2">
                    <label className="input-label">Separador entre segmentos</label>
                    <div className="configuracao-sku-separadores-group">
                      {SEPARADORES_OPCOES.map(op => {
                        const isSelected = config.separador === op.valor;
                        return (
                          <button
                            key={op.valor}
                            type="button"
                            className={`configuracao-sku-sep-btn ${isSelected ? 'configuracao-sku-sep-btn--selected' : ''}`}
                            onClick={() => setField('separador', op.valor)}
                          >
                            <span className="configuracao-sku-sep-char">{op.char}</span>
                            <span className="configuracao-sku-sep-text">{op.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="padrao-tipo">Tipo da sequência *</label>
                    <select
                      id="padrao-tipo"
                      className="input-field"
                      value={config.tipo_sku}
                      onChange={e => setField('tipo_sku', e.target.value)}
                    >
                      {TIPO_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="configuracao-sku-help">
                      {TIPO_OPTIONS.find(o => o.value === config.tipo_sku)?.help}
                    </span>
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="padrao-tamanho">Tamanho da sequência (dígitos) *</label>
                    <input
                      id="padrao-tamanho"
                      className="input-field"
                      type="number"
                      min="1"
                      max="18"
                      value={config.tamanho_sequencia}
                      onChange={e => setField('tamanho_sequencia', e.target.value)}
                      required
                    />
                    <span className="configuracao-sku-help">
                      Ex.: 3 preenche com zeros (001, 002); 4 preenche com (0001).
                    </span>
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="padrao-prefixo">Prefixo opcional</label>
                    <input
                      id="padrao-prefixo"
                      className="input-field"
                      placeholder="Ex.: CH"
                      value={config.prefixo}
                      onChange={e => setField('prefixo', e.target.value)}
                      maxLength={30}
                    />
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="padrao-sufixo">Sufixo opcional</label>
                    <input
                      id="padrao-sufixo"
                      className="input-field"
                      placeholder="Ex.: V1"
                      value={config.sufixo}
                      onChange={e => setField('sufixo', e.target.value)}
                      maxLength={30}
                    />
                  </div>

                  <div className="input-wrapper">
                    <label className="input-label" htmlFor="padrao-inicio">Início da sequência *</label>
                    <input
                      id="padrao-inicio"
                      className="input-field"
                      type="number"
                      min="0"
                      value={config.inicio_sequencia}
                      onChange={e => setField('inicio_sequencia', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </section>

              {/* Seção 2: Segmentos e Pipeline Conectado */}
              <section className="card configuracao-sku-section">
                <div className="configuracao-sku-section-title">
                  <Layers size={18} />
                  <div>
                    <h2>Composição dos Segmentos</h2>
                    <p>
                      Defina a ordem e os níveis de categoria que compõem o código do SKU. A sequência é parte especial do gerador e conclui o SKU.
                    </p>
                  </div>
                </div>

                {/* Pipeline Conectado Visual */}
                <div className="configuracao-sku-pipeline-wrapper">
                  <div className="configuracao-sku-pipeline-label">Composição Visual do SKU:</div>
                  <div className="configuracao-sku-pipeline">
                    {config.prefixo && (
                      <>
                        <div className="configuracao-sku-pipeline-node configuracao-sku-pipeline-node--extra">
                          <span className="configuracao-sku-node-title">Prefixo</span>
                          <span className="configuracao-sku-node-code">{config.prefixo}</span>
                        </div>
                        <span className="configuracao-sku-pipeline-arrow">→</span>
                      </>
                    )}

                    {config.segmentos
                      .filter(s => s.participa_sku)
                      .map((seg, idx) => (
                        <div key={seg.nivel} className="configuracao-sku-pipeline-node-container">
                          <div className="configuracao-sku-pipeline-node">
                            <span className="configuracao-sku-node-title">{seg.nome || `Nível ${seg.nivel}`}</span>
                            <span className="configuracao-sku-node-code">
                              {obterCodigoExemplo(seg, idx, categorias, niveis)}
                            </span>
                          </div>
                          <span className="configuracao-sku-pipeline-arrow">→</span>
                        </div>
                      ))}

                    {/* Nó de Sequência Especial */}
                    <div className="configuracao-sku-pipeline-node configuracao-sku-pipeline-node--sequence">
                      <span className="configuracao-sku-node-title">
                        <Hash size={11} style={{ display: 'inline', marginRight: 2 }} />
                        Sequência
                      </span>
                      <span className="configuracao-sku-node-code">
                        {formatarSequenciaPreview(config.inicio_sequencia, config.tipo_sku, config.tamanho_sequencia)}
                      </span>
                    </div>

                    {config.sufixo && (
                      <>
                        <span className="configuracao-sku-pipeline-arrow">→</span>
                        <div className="configuracao-sku-pipeline-node configuracao-sku-pipeline-node--extra">
                          <span className="configuracao-sku-node-title">Sufixo</span>
                          <span className="configuracao-sku-node-code">{config.sufixo}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Lista de Segmentos */}
                {config.segmentos.length === 0 ? (
                  <div className="configuracao-sku-empty-segmentos">
                    <p>Nenhum segmento configurado para este padrão.</p>
                    <span>
                      O SKU será gerado exclusivamente pelo prefixo, sequência e sufixo.
                    </span>
                  </div>
                ) : (
                  <div className="configuracao-sku-segmentos">
                    {config.segmentos.map((segmento, index) => (
                      <div className="configuracao-sku-segmento" key={segmento.nivel}>
                        <div className="configuracao-sku-segmento-order">
                          {index + 1}
                        </div>

                        <div className="configuracao-sku-segmento-main">
                          <div className="configuracao-sku-segmento-fields">
                            <div className="input-wrapper">
                              <label className="input-label">Nível de Categoria</label>
                              <select
                                className="input-field"
                                value={segmento.nivel}
                                onChange={e => updateSegmento(index, 'nivel', Number(e.target.value))}
                              >
                                <option value={segmento.nivel}>
                                  Nível {segmento.nivel}
                                  {niveis.find(n => Number(n.nivel) === Number(segmento.nivel))?.nome
                                    ? ` — ${niveis.find(n => Number(n.nivel) === Number(segmento.nivel)).nome}`
                                    : ''}
                                </option>
                                {niveisDisponiveis.map(nivel => (
                                  <option key={nivel.nivel} value={nivel.nivel}>
                                    Nível {nivel.nivel}{nivel.nome ? ` — ${nivel.nome}` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="input-wrapper">
                              <label className="input-label">Nome do Segmento</label>
                              <input
                                className="input-field"
                                placeholder="Ex.: Família, Material, Público"
                                value={segmento.nome}
                                onChange={e => updateSegmento(index, 'nome', e.target.value)}
                                maxLength={255}
                              />
                            </div>
                          </div>

                          <div className="configuracao-sku-toggles">
                            <label>
                              <input
                                type="checkbox"
                                checked={segmento.obrigatorio}
                                onChange={e => updateSegmento(index, 'obrigatorio', e.target.checked)}
                              />
                              Obrigatório no cadastro
                            </label>

                            <label>
                              <input
                                type="checkbox"
                                checked={segmento.participa_sku}
                                onChange={e => updateSegmento(index, 'participa_sku', e.target.checked)}
                              />
                              Participa do código SKU
                            </label>
                          </div>
                        </div>

                        <div className="configuracao-sku-segmento-actions">
                          <button
                            type="button"
                            className="configuracao-sku-btn-icon"
                            onClick={() => moverSegmento(index, 'up')}
                            disabled={index === 0}
                            title="Mover para cima"
                            aria-label="Mover para cima"
                          >
                            <ArrowUp size={14} />
                          </button>
                          <button
                            type="button"
                            className="configuracao-sku-btn-icon"
                            onClick={() => moverSegmento(index, 'down')}
                            disabled={index === config.segmentos.length - 1}
                            title="Mover para baixo"
                            aria-label="Mover para baixo"
                          >
                            <ArrowDown size={14} />
                          </button>
                          <button
                            type="button"
                            className="configuracao-sku-btn-icon configuracao-sku-btn-icon--danger"
                            onClick={() => removeSegmento(index)}
                            title="Remover segmento"
                            aria-label="Remover segmento"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="configuracao-sku-segmentos-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={addSegmento}
                    disabled={!niveisDisponiveis.length}
                  >
                    <Plus size={16} />
                    Adicionar segmento
                  </button>

                  {!niveisDisponiveis.length && niveis.length > 0 && (
                    <span className="configuracao-sku-help">
                      Todos os níveis cadastrados já participam deste padrão.
                    </span>
                  )}
                  {!niveis.length && (
                    <span className="configuracao-sku-help">
                      Cadastre novos níveis em Configurações → Categorias de produto para utilizá-los aqui.
                    </span>
                  )}
                </div>
              </section>
            </form>
          </main>

          {/* Coluna 3: Prévia em Tempo Real */}
          <aside className="configuracao-sku-preview-sidebar">
            <div className="card configuracao-sku-preview-card">
              <div className="configuracao-sku-preview-header">
                <Sparkles size={16} className="configuracao-sku-sparkle" />
                <span className="configuracao-sku-preview-label">Prévia em tempo real</span>
              </div>

              <div className="configuracao-sku-preview-hero">
                <span className="configuracao-sku-preview-tag">Exemplo gerado</span>
                <div className="configuracao-sku-preview-value" title={skuPreview}>
                  {skuPreview || '001'}
                </div>
              </div>

              <div className="configuracao-sku-breakdown">
                <div className="configuracao-sku-breakdown-title">Decomposição do SKU:</div>
                <div className="configuracao-sku-breakdown-list">
                  {previewItems.map((item, idx) => (
                    <div key={idx} className="configuracao-sku-breakdown-row">
                      <span className="configuracao-sku-breakdown-label">{item.rotulo}</span>
                      <strong className="configuracao-sku-breakdown-code">{item.valor}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="configuracao-sku-preview-footer">
                <p>
                  Os códigos de categoria reais serão associados quando novos produtos forem categorizados. SKUs já criados permanecem inalterados.
                </p>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
