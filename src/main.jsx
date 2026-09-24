import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './styles/index.css'
import App from './App.jsx'
import { installGlobalErrorReporting } from './utils/errorReporting.js'

const removeErrorReporting = installGlobalErrorReporting()
if (import.meta.hot) import.meta.hot.dispose(removeErrorReporting)

// The browser restores the last scroll position on refresh by default
// (history.scrollRestoration = "auto"), which fights the "always land at
// the top" behavior — every reload should start fresh instead.
if ('scrollRestoration' in window.history) {
  window.history.scrollRestoration = 'manual'
}

// Opts in to the scroll-reveal hidden starting state (App.css). Set here,
// before the first render, rather than in index.html — an inline script
// there would need its own CSP hash in vercel.json. If this bundle never
// runs, the class is never added and content simply shows unanimated.
document.documentElement.classList.add('hp-js')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
