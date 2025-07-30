import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Ensure React is properly loaded before rendering
if (!React || !React.useLayoutEffect) {
  console.error('React is not properly loaded. This might be a bundling issue.');
  throw new Error('React is not properly loaded');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
) 