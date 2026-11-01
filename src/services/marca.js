import { apiFetch } from './api';
import { TEMAS } from '../theme/themes';

// Marca (identidade visual) de uma empresa ANTES do login. O endereço /c/<slug> consulta o backend,
// que devolve só { slug, tema } de empresa ativa (404 uniforme caso contrário). Nada sensível aqui.

const CHAVE = 'vertumno.marca';
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/;

export function slugValido(slug) {
  return typeof slug === 'string' && SLUG_RE.test(slug);
}

// Devolve { slug, tema }; null quando a marca não existe (slug malformado ou 404); undefined quando a
// consulta falhou por outro motivo (rede, 5xx, limite) — aí não se sabe, e nada lembrado deve ser apagado.
// Nunca lança: a tela cai no padrão.
export async function buscarMarcaPublica(slug) {
  const normalizado = String(slug ?? '').toLowerCase();
  if (!slugValido(normalizado)) return null;

  try {
    const body = await apiFetch(`/publico/marca/${encodeURIComponent(normalizado)}`, { skipAuthRedirect: true });
    const dados = body?.data;
    if (!dados || !Object.prototype.hasOwnProperty.call(TEMAS, dados.tema)) return undefined;
    return { slug: dados.slug, tema: dados.tema };
  } catch (err) {
    return err?.status === 404 ? null : undefined;
  }
}

function storageLocal(storage) {
  if (storage) return storage;
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

// Última marca usada neste navegador (só o tema e o endereço): faz /login abrir já com a identidade
// de quem costuma entrar aqui. Nunca guarda dado de empresa além disso.
export function carregarMarcaLembrada(storage) {
  const s = storageLocal(storage);
  if (!s) return null;
  try {
    const dados = JSON.parse(s.getItem(CHAVE) || 'null');
    if (!dados || !Object.prototype.hasOwnProperty.call(TEMAS, dados.tema)) return null;
    return { tema: dados.tema, slug: slugValido(dados.slug) ? dados.slug : null };
  } catch {
    return null;
  }
}

export function lembrarMarca({ tema, slug = null }, storage) {
  const s = storageLocal(storage);
  if (!s || !Object.prototype.hasOwnProperty.call(TEMAS, tema)) return;
  try {
    s.setItem(CHAVE, JSON.stringify({ tema, slug: slugValido(slug) ? slug : null }));
  } catch {
    // sem storage: a marca só vale nesta visita
  }
}

export function esquecerMarca(storage) {
  const s = storageLocal(storage);
  if (!s) return;
  try {
    s.removeItem(CHAVE);
  } catch {
    // nada a limpar
  }
}
