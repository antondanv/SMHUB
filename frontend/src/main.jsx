import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthProvider.jsx'
import { ReferenceDataProvider } from './context/ReferenceDataProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <ReferenceDataProvider>
        <App />
      </ReferenceDataProvider>
    </AuthProvider>
  </StrictMode>,
)
