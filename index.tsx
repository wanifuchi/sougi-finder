import React from 'react';
import ReactDOM from 'react-dom/client';
// import { BrowserRouter } from 'react-router-dom'; // React Router実装用（コメントアウト・保存中）
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {/* 過去の単一ページ実装（現在使用中） */}
    <App />

    {/* React Router実装（コメントアウト・保存中）
    <BrowserRouter>
      <App />
    </BrowserRouter>
    */}
  </React.StrictMode>
);
