
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { initStore } from './services/store';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Initialisation asynchrone sécurisée
const startApp = async () => {
  console.log(`🚀 NurseBot PRO - Démarrage du système`);
  console.log(`📦 Build: ${process.env.VITE_BUILD_DATE || 'Développement'}`);

  try {
    await initStore();
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Erreur critique lors de l'initialisation de NurseBot:", err);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
};

startApp();
