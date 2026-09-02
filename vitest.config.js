import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // .claude/worktrees/** pode conter checkouts paralelos deste mesmo
    // repositório (Claude Code worktrees) — sem isso, arquivos de teste
    // de um worktree ativo são descobertos de novo aqui, duplicando os
    // resultados (ou quebrando a suíte se o worktree estiver em estado
    // intermediário).
    exclude: ['**/node_modules/**', '**/dist/**', '.claude/**'],
  },
});
