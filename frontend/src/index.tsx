import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { ToastProvider } from '@/lib/toast';
import './index.css';
import './premium.css';
import './ops.css';

const container = document.getElementById('root');
const root = createRoot(container as HTMLElement);
root.render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>
);
