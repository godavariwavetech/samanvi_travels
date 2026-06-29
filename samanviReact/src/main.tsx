import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

document.addEventListener('wheel', () => {
  if (document.activeElement instanceof HTMLInputElement && document.activeElement.type === 'number') {
    document.activeElement.blur()
  }
}, { passive: true })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
