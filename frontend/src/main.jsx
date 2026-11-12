import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { registerSynced, startSync } from './api/sync';
import { SYNCED_STORES } from './data/stores';

// Save progress to the Python backend when it's running (browser-only otherwise).
registerSynced(...SYNCED_STORES);
startSync();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
