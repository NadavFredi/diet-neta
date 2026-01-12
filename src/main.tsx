import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Suppress react-quill findDOMNode deprecation warning in development
// This is a known issue with the react-quill library and cannot be fixed without modifying the library
if (import.meta.env.DEV) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = typeof args[0] === 'string' ? args[0] : String(args[0]);
    // Suppress the specific findDOMNode warning from react-quill
    if (message.includes('findDOMNode is deprecated') || message.includes('findDOMNode')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
