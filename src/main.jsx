import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './theme/themes.css';
import App from './App.jsx';
import { iniciarMonitoramento } from './monitoramento';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Depois de a tela abrir; só faz algo se VITE_SENTRY_DSN estiver definido no build.
iniciarMonitoramento().catch(() => {});
