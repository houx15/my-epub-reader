import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';
import './styles/globals.css';
import { createLLMService } from './services/llm';
import { useAppStore } from './stores/appStore';

// Initialize LLM service with config
async function initializeApp() {
  try {
    const config = await window.electron.loadConfig();
    const store = useAppStore.getState();

    store.setConfig(config);
    if (config.display?.theme) {
      store.setTheme(config.display.theme);
    }
    if (typeof config.display?.fontSize === 'number') {
      store.setFontSize(config.display.fontSize);
    }
    if (typeof config.display?.notesFontSize === 'number') {
      store.setNotesFontSize(config.display.notesFontSize);
    }

    if (config.llm.apiKey) {
      createLLMService({
        apiKey: config.llm.apiKey,
        model: config.llm.model,
        baseUrl: config.llm.baseUrl,
      });
      console.log('✅ LLM service initialized');
    } else {
      console.warn('⚠️ No API key configured. LLM features will be disabled.');
    }
  } catch (error) {
    console.error('Failed to initialize LLM service:', error);
  }
}

// Initialize app
initializeApp();

// Render React app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
