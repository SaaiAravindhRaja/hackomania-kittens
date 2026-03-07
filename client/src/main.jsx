import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './hooks/use-auth.jsx'
import App from './app.jsx'
import './styles/globals.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <div className="dark">
        <App />
      </div>
    </AuthProvider>
  </BrowserRouter>
)
