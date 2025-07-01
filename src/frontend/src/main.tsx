import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AguiProvider } from './contexts/AguiContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AguiProvider 
      autoConnect={true}
      config={{
        reconnectAttempts: 5,
        heartbeatInterval: 30000
      }}
    >
      <App />
    </AguiProvider>
  </React.StrictMode>,
) 