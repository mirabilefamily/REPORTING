import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import { ToastProvider } from '@/lib/toast';
import { CartProvider } from '@/lib/cart';
import './index.css';
import './premium.css';
import './ops.css';

const container = document.getElementById('root');
const root = createRoot(container as HTMLElement);
root.render(
  <StrictMode>
    <ToastProvider>
      <CartProvider>
        <App />
      </CartProvider>
    </ToastProvider>
  </StrictMode>
);
