import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SesionProvider } from './sesion/SesionContext';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    {/* SesionProvider envuelve toda la app para que cualquier componente sepa quién inició sesión */}
    <SesionProvider>
      <App />
    </SesionProvider>
  </StrictMode>,
);
