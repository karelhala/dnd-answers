import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { loadWorkshop } from './state/persistence';
import { WorkshopProvider } from './state/WorkshopProvider';
import './styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Application root is missing.');
}

const initial = loadWorkshop();

createRoot(root).render(
  <StrictMode>
    <WorkshopProvider initial={initial}>
      <App />
    </WorkshopProvider>
  </StrictMode>,
);
