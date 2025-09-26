import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './output.css' 
import App from './App.tsx'
import 'react-spring-bottom-sheet/dist/style.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
