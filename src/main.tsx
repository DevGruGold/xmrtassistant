import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { memoryVectorizationWorker } from './services/memoryVectorizationWorker'
import { CredentialSessionProvider } from './contexts/CredentialSessionContext'

// Start the memory vectorization background worker
memoryVectorizationWorker.start();

createRoot(document.getElementById("root")!).render(
  <CredentialSessionProvider>
    <App />
  </CredentialSessionProvider>
);
