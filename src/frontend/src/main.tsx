import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // We'll create this next
import { ThemeProvider } from '@/components/theme-provider'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { TelegramProvider } from "./contexts/TelegramContext";

// Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual Google Client ID
const googleClientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={googleClientId}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <TelegramProvider>
          <App />
        </TelegramProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
) 