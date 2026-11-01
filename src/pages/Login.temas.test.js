import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: async () => {}, isAuthenticated: false, user: null }),
}));

import Login from './Login.jsx';
import LoginMarca from './LoginMarca.jsx';
import { ThemeContext } from '../theme/themeContext';
import { TEMAS } from '../theme/themes';

const renderLogin = tema => renderToStaticMarkup(
  createElement(
    ThemeContext.Provider,
    { value: { tema, definirTemaBase: () => {}, ...TEMAS[tema] } },
    createElement(MemoryRouter, null, createElement(Login))
  )
);

describe('Login por tema', () => {
  it('VERTUMNO (padrão): layout navy, frase "GESTÃO QUE IMPULSIONA" e saudação neutra', () => {
    const html = renderLogin('vertumno');
    expect(html).toContain('login-page-vertumno');
    expect(html).toContain('login-page-tema-vertumno');
    expect(html).toContain('GESTÃO QUE IMPULSIONA');
    expect(html).toContain('Bem-vindo de volta');
    expect(html).toContain('VERTUMNO');
  });

  it('Cherry: mantém a tela própria (classe, saudação feminina, sem a frase do VERTUMNO)', () => {
    const html = renderLogin('cherry');
    expect(html).toContain('login-page-cherry');
    expect(html).not.toContain('login-page-vertumno');
    expect(html).toContain('Bem-vinda de volta');
    expect(html).toContain('Cherry Semijoias');
    expect(html).not.toContain('GESTÃO QUE IMPULSIONA');
  });

  it('Valvazori: tela própria — nome, logo e símbolo do cliente, sem a frase nem o nome do VERTUMNO', () => {
    const html = renderLogin('valvazori');
    expect(html).toContain('login-page-tema-valvazori');
    expect(html).toContain('Valvazori Imports');
    expect(html).toContain(TEMAS.valvazori.marca.logo);
    expect(html).toContain(TEMAS.valvazori.marca.simbolo);
    expect(html).not.toContain('GESTÃO QUE IMPULSIONA');
    expect(html).not.toContain('VERTUMNO');
    expect(html).not.toContain(TEMAS.vertumno.marca.logo);
  });
});

describe('/c/:slug', () => {
  it('antes de a marca chegar do backend não desenha nenhuma marca (sem piscar a errada)', () => {
    const html = renderToStaticMarkup(
      createElement(
        ThemeContext.Provider,
        { value: { tema: 'vertumno', definirTemaBase: () => {}, ...TEMAS.vertumno } },
        createElement(
          MemoryRouter,
          { initialEntries: ['/c/cherry'] },
          createElement(Routes, null, createElement(Route, { path: '/c/:slug', element: createElement(LoginMarca) }))
        )
      )
    );
    expect(html).toContain('login-page--carregando');
    expect(html).toContain('aria-busy="true"');
    expect(html).not.toContain('VERTUMNO');
    expect(html).not.toContain('Cherry');
  });
});
