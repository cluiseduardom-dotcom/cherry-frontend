import { createContext, useContext } from 'react';
import { TEMAS, TEMA_PADRAO } from './themes';

// Valor padrão = tema padrão: componentes funcionam mesmo sem ThemeProvider.
export const ThemeContext = createContext({ tema: TEMA_PADRAO, definirTemaBase: () => {}, ...TEMAS[TEMA_PADRAO] });

export function useTheme() {
  return useContext(ThemeContext);
}
