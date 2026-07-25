import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import 'bootstrap/dist/css/bootstrap.min.css'
import './theme.css'
import App from './components/App'
import { AuthProvider } from './AuthContext'
import { ToastProvider } from './ToastContext'
import { ThemeProvider } from './ThemeContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <ToastProvider>
          <AuthProvider>
            <App/>
          </AuthProvider>
        </ToastProvider>
      </GoogleOAuthProvider>
    </ThemeProvider>
  </React.StrictMode>
)
