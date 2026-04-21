import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import useAuthStore from './store/authStore.js'

// D-07: Validate JWT expiry on app boot before React renders.
// init() reads localStorage (synchronous via Zustand persist rehydration),
// decodes the exp claim, and clears expired tokens. Sets initialized=true.
useAuthStore.getState().init()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
