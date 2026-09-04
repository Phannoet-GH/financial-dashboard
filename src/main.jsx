// src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MarketProvider } from './context/MarketContext';
import App from './App.jsx';
import './styles/globals.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MarketProvider>
      <App />
    </MarketProvider>
  </StrictMode>,
);
