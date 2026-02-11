import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register service worker for PWA functionality
import { registerSW } from 'virtual:pwa-register';

if ('serviceWorker' in navigator) {
  const updateSW = registerSW({
    onNeedRefresh() {
      // Prompt user to update or automatically update
      if (confirm('Yeni bir versiyon mevcut. Yenilemek ister misiniz?')) {
        updateSW(true);
      }
    },
    onOfflineReady() {
      console.log('Uygulama offline kullanıma hazır!');
    },
  });
}