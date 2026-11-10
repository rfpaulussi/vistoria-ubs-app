import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { UNIDADE_PACO, usaPilotoPaco } from './src/lib/paco';
import './index.css';

if (usaPilotoPaco) {
  document.title = UNIDADE_PACO + ' · Vistoria de limpeza';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#124b45');
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
