import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { ToastProvider } from '@/lib/toast';
import './index.css';
import './premium.css';
import './ops.css';

// TEMP DIAGNOSTIC: capture true error details for "Script error." overlays
window.addEventListener('error', (e) => {
  // eslint-disable-next-line no-console
  console.error('[GLOBAL ERROR]', e.message, e.filename, e.lineno, e.colno, e.error);
});
window.addEventListener('unhandledrejection', (e) => {
  // eslint-disable-next-line no-console
  console.error('[UNHANDLED REJECTION]', (e as PromiseRejectionEvent).reason);
});

const container = document.getElementById('root');
const root = createRoot(container as HTMLElement);
root.render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
