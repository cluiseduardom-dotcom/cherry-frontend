import { describe, it, expect } from 'vitest';
import {
  normalizarPadrao,
  formatarSequenciaPreview,
  obterCodigoExemplo,
  montarPreviaSku,
  decomporSegmentosPreview,
  validarPadrao,
} from './ConfiguracaoSku.jsx';

describe('ConfiguracaoSku — Padrões de SKU v2', () => {
  describe('normalizarPadrao', () => {
    it('retorna configuração padrão inicial quando dados forem nulos', () => {
      const padrao = normalizarPadrao(null);
      expect(padrao.nome).toBe('Novo Padrão');
      expect(padrao.separador).toBe('-');
      expect(padrao.tipo_sku).toBe('numerico');
      expect(padrao.tamanho_sequencia).toBe(3);
      expect(padrao.inicio_sequencia).toBe(1);
      expect(padrao.segmentos).toEqual([]);
    });

    it('ordena os segmentos por ordem ascendente e normaliza campos', () => {
      const dados = {
        id: 1,
        nome: 'Padrão SemiJoias',
        padrao: true,
        separador: '-',
        tamanho_sequencia: '3',
        inicio_sequencia: '1',
        segmentos: [
          { nivel: 2, ordem: 2, nome: 'Material', obrigatorio: true },
          { nivel: 1, ordem: 1, nome: 'Família', obrigatorio: true },
        ],
      };
      const normalizado = normalizarPadrao(dados);
      expect(normalizado.id).toBe(1);
      expect(normalizado.padrao).toBe(true);
      expect(normalizado.segmentos[0].nome).toBe('Família');
      expect(normalizado.segmentos[1].nome).toBe('Material');
      expect(normalizado.segmentos[0].ordem).toBe(1);
      expect(normalizado.segmentos[1].ordem).toBe(2);
    });
  });

  describe('formatarSequenciaPreview', () => {
    it('formata sequência numérica com preenchimento de zeros', () => {
      expect(formatarSequenciaPreview(1, 'numerico', 3)).toBe('001');
      expect(formatarSequenciaPreview(1, 'numerico', 4)).toBe('0001');
      expect(formatarSequenciaPreview(42, 'numerico', 5)).toBe('00042');
      expect(formatarSequenciaPreview(999, 'numerico', 3)).toBe('999');
    });

    it('formata sequência alfabética com preenchimento de letras', () => {
      expect(formatarSequenciaPreview(1, 'alfabetico', 3)).toBe('AAA');
      expect(formatarSequenciaPreview(2, 'alfabetico', 3)).toBe('AAB');
    });

    it('respeita limites mínimo e máximo de tamanho (1 a 18)', () => {
      expect(formatarSequenciaPreview(5, 'numerico', 0)).toBe('5'); // clamp em 1
      expect(formatarSequenciaPreview(1, 'numerico', 25).length).toBe(18); // clamp em 18
    });
  });

  describe('obterCodigoExemplo', () => {
    it('usa código de categoria cadastrada no sistema se disponível', () => {
      const categorias = [{ nivel: 1, codigo: 'BR', nome: 'Brincos' }];
      const segmento = { nivel: 1, nome: 'Categoria Principal' };
      expect(obterCodigoExemplo(segmento, 0, categorias)).toBe('BR');
    });

    it('reconhece termos do padrão Cherry SemiJoias (Família -> CO, Material -> BO, Público -> FE)', () => {
      expect(obterCodigoExemplo({ nivel: 1, nome: 'Família' })).toBe('CO');
      expect(obterCodigoExemplo({ nivel: 2, nome: 'Material' })).toBe('BO');
      expect(obterCodigoExemplo({ nivel: 3, nome: 'Público' })).toBe('FE');
    });

    it('deriva código com as primeiras 2 letras se não houver categoria nem termo clássico', () => {
      expect(obterCodigoExemplo({ nivel: 4, nome: 'Coleção' })).toBe('CO');
      expect(obterCodigoExemplo({ nivel: 5, nome: 'Gênero' })).toBe('GE');
    });
  });

  describe('montarPreviaSku — Demonstração do Motor v2 Cherry SemiJoias', () => {
    const configSemiJoias = {
      nome: 'Padrão SemiJoias',
      padrao: true,
      tipo_sku: 'numerico',
      separador: '-',
      prefixo: '',
      sufixo: '',
      tamanho_sequencia: 3,
      inicio_sequencia: 1,
      segmentos: [
        { nivel: 1, ordem: 1, nome: 'Família', obrigatorio: true, participa_sku: true },
        { nivel: 2, ordem: 2, nome: 'Material', obrigatorio: true, participa_sku: true },
        { nivel: 3, ordem: 3, nome: 'Público', obrigatorio: true, participa_sku: true },
      ],
    };

    it('gera a prévia exata do critério de aceite: CO-BO-FE-001', () => {
      const previa = montarPreviaSku(configSemiJoias);
      expect(previa).toBe('CO-BO-FE-001');
    });

    it('ao alterar o separador para sublinhado "_", atualiza para CO_BO_FE_001', () => {
      const config = { ...configSemiJoias, separador: '_' };
      expect(montarPreviaSku(config)).toBe('CO_BO_FE_001');
    });

    it('ao alterar o tamanho da sequência para 4 dígitos, atualiza para CO-BO-FE-0001', () => {
      const config = { ...configSemiJoias, tamanho_sequencia: 4 };
      expect(montarPreviaSku(config)).toBe('CO-BO-FE-0001');
    });

    it('ao incluir prefixo e sufixo, incorpora-os adequadamente', () => {
      const config = { ...configSemiJoias, prefixo: 'CH', sufixo: 'V1' };
      expect(montarPreviaSku(config)).toBe('CH-CO-BO-FE-001-V1');
    });

    it('ao definir separador vazio, concatena os elementos diretamente', () => {
      const config = { ...configSemiJoias, separador: '' };
      expect(montarPreviaSku(config)).toBe('COBOFE001');
    });

    it('ignora segmentos que não participam do SKU', () => {
      const config = {
        ...configSemiJoias,
        segmentos: [
          { nivel: 1, ordem: 1, nome: 'Família', participa_sku: true },
          { nivel: 2, ordem: 2, nome: 'Material', participa_sku: false },
          { nivel: 3, ordem: 3, nome: 'Público', participa_sku: true },
        ],
      };
      expect(montarPreviaSku(config)).toBe('CO-FE-001');
    });
  });

  describe('decomporSegmentosPreview', () => {
    it('decompõe cada segmento com seu rótulo e valor de exemplo', () => {
      const config = {
        tipo_sku: 'numerico',
        separador: '-',
        tamanho_sequencia: 3,
        inicio_sequencia: 1,
        segmentos: [
          { nivel: 1, nome: 'Família', participa_sku: true },
          { nivel: 2, nome: 'Material', participa_sku: true },
          { nivel: 3, nome: 'Público', participa_sku: true },
        ],
      };

      const itens = decomporSegmentosPreview(config);
      expect(itens).toEqual([
        { rotulo: 'Família', valor: 'CO' },
        { rotulo: 'Material', valor: 'BO' },
        { rotulo: 'Público', valor: 'FE' },
        { rotulo: 'Sequência', valor: '001' },
      ]);
    });
  });

  describe('validarPadrao', () => {
    it('exige nome do padrão', () => {
      expect(validarPadrao({ nome: '' })).toBe('Nome do padrão é obrigatório');
      expect(validarPadrao({ nome: '   ' })).toBe('Nome do padrão é obrigatório');
    });

    it('impede nomes duplicados entre padrões diferentes', () => {
      const outros = [{ id: 1, nome: 'Padrão SemiJoias' }];
      expect(validarPadrao({ id: 2, nome: 'Padrão SemiJoias' }, outros)).toBe(
        'Já existe um padrão cadastrado com este nome'
      );
      // Mesmo id (edição do próprio padrão) deve ser permitido
      expect(validarPadrao({ id: 1, nome: 'Padrão SemiJoias', tamanho_sequencia: 3, inicio_sequencia: 1 }, outros)).toBe('');
    });

    it('valida separadores permitidos', () => {
      const base = { nome: 'Padrão Teste', tamanho_sequencia: 3, inicio_sequencia: 1 };
      expect(validarPadrao({ ...base, separador: '-' })).toBe('');
      expect(validarPadrao({ ...base, separador: '_' })).toBe('');
      expect(validarPadrao({ ...base, separador: '/' })).toBe('');
      expect(validarPadrao({ ...base, separador: 'x' })).toBe('');
      expect(validarPadrao({ ...base, separador: '*' })).toBe('');
      expect(validarPadrao({ ...base, separador: '+' })).toBe('');
      expect(validarPadrao({ ...base, separador: '' })).toBe('');
      expect(validarPadrao({ ...base, separador: '@' })).toContain('Separador de SKU não permitido');
    });

    it('valida limites de sequência', () => {
      const base = { nome: 'Padrão Teste', separador: '-' };
      expect(validarPadrao({ ...base, tamanho_sequencia: 0, inicio_sequencia: 1 })).toBe(
        'Tamanho da sequência deve estar entre 1 e 18'
      );
      expect(validarPadrao({ ...base, tamanho_sequencia: 19, inicio_sequencia: 1 })).toBe(
        'Tamanho da sequência deve estar entre 1 e 18'
      );
      expect(validarPadrao({ ...base, tamanho_sequencia: 3, inicio_sequencia: -1 })).toBe(
        'Início da sequência deve ser maior ou igual a zero'
      );
    });

    it('impede desmarcar fallback (padrao=false) se não houver outro padrão fallback ativo', () => {
      // Padrão único da empresa marcado como fallback sendo editado para padrao=false
      const config = {
        id: 1,
        nome: 'Padrão Principal',
        padrao: false,
        separador: '-',
        tamanho_sequencia: 3,
        inicio_sequencia: 1,
      };
      const outrosPadroes = [
        { id: 1, nome: 'Padrão Principal', padrao: true, ativo: true },
      ];

      expect(validarPadrao(config, outrosPadroes)).toBe(
        'A empresa deve possuir sempre pelo menos um padrão ativo definido como padrão principal/fallback. Para desmarcar este padrão, defina outro padrão como principal primeiro.'
      );
    });

    it('impede desmarcar fallback se existirem outros padrões mas nenhum deles for fallback', () => {
      const config = {
        id: 1,
        nome: 'Padrão Principal',
        padrao: false,
        separador: '-',
        tamanho_sequencia: 3,
        inicio_sequencia: 1,
      };
      const outrosPadroes = [
        { id: 1, nome: 'Padrão Principal', padrao: true, ativo: true },
        { id: 2, nome: 'Padrão Alternativo', padrao: false, ativo: true },
      ];

      expect(validarPadrao(config, outrosPadroes)).toBe(
        'A empresa deve possuir sempre pelo menos um padrão ativo definido como padrão principal/fallback. Para desmarcar este padrão, defina outro padrão como principal primeiro.'
      );
    });

    it('permite salvar com padrao=false se existir outro padrão ativo marcado como fallback', () => {
      const config = {
        id: 2,
        nome: 'Padrão Alternativo',
        padrao: false,
        separador: '-',
        tamanho_sequencia: 3,
        inicio_sequencia: 1,
      };
      const outrosPadroes = [
        { id: 1, nome: 'Padrão Principal', padrao: true, ativo: true },
        { id: 2, nome: 'Padrão Alternativo', padrao: false, ativo: true },
      ];

      expect(validarPadrao(config, outrosPadroes)).toBe('');
    });

    it('permite salvar com padrao=true mesmo quando for o único padrão', () => {
      const config = {
        id: 1,
        nome: 'Padrão Principal',
        padrao: true,
        separador: '-',
        tamanho_sequencia: 3,
        inicio_sequencia: 1,
      };
      const outrosPadroes = [
        { id: 1, nome: 'Padrão Principal', padrao: true, ativo: true },
      ];

      expect(validarPadrao(config, outrosPadroes)).toBe('');
    });
  });
});
