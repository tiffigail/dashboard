// src/main.jsx (or your main entry point)
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css' // Your global CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
