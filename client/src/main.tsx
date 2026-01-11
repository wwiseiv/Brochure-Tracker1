import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for offline support
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[App] Service Worker registered successfully:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available, prompt user to refresh
                console.log('[App] Service Worker update available');
                // You can show a notification to the user here
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('[App] Service Worker registration failed:', error);
      });
  });

  // Handle messages from service worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data.type === 'SW_ACTIVATED') {
      console.log('[App] Service Worker activated with version:', event.data.version);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
