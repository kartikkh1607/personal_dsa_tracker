import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { registerServiceWorker } from './serviceWorker.js'
import './index.css'

registerServiceWorker()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
