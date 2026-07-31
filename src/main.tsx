import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/index.css';

if (import.meta.env.DEV) {
  // Dev-only handle for poking at state from the console.
  void Promise.all([
    import('./stores/uiStore'),
    import('./stores/documentsStore'),
    import('./stores/workspaceStore'),
    import('./stores/settingsStore'),
  ]).then(([ui, documents, workspace, settings]) => {
    (window as unknown as Record<string, unknown>).__rmd = {
      ui: ui.useUIStore,
      documents: documents.useDocumentsStore,
      workspace: workspace.useWorkspaceStore,
      settings: settings.useSettingsStore,
    };
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
