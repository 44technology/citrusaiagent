import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Number inputs change value on mouse-wheel scroll while focused — very easy
// to trigger by accident while scrolling the page (e.g. Amount fields).
// Blur it on wheel instead, so scrolling never silently edits a number.
document.addEventListener('wheel', (e) => {
  if (document.activeElement?.tagName === 'INPUT' && document.activeElement.type === 'number') {
    document.activeElement.blur();
  }
}, { passive: true });

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
