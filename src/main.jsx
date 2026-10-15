import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { SesionProveedor } from './context/Sesion';
import { AvisosProveedor } from './context/Avisos';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AvisosProveedor>
      <SesionProveedor>
        <App />
      </SesionProveedor>
    </AvisosProveedor>
  </StrictMode>
);
