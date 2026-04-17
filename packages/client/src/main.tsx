import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { setupServiceWorkerUpdates } from './registerSW';
import './styles/globals.css';

setupServiceWorkerUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
