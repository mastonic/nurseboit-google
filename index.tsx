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
  try {
    await initStore();
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (err) {
    console.error("Erreur critique lors de l'initialisation de NurseBot:", err);
    // On tente quand même de rendre l'App, car le store a un fallback localStorage
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
};

startApp();