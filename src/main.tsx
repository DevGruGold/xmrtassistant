import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Contributors from './pages/Contributors.tsx'
import './index.css'
import { memoryVectorizationWorker } from './services/memoryVectorizationWorker'
import { CredentialSessionProvider } from './contexts/CredentialSessionContext'

// Start the memory vectorization background worker
memoryVectorizationWorker.start();

createRoot(document.getElementById("root")!).render(
  <CredentialSessionProvider>
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/contributors" element={<Contributors />} />
      </Routes>
    </Router>
  </CredentialSessionProvider>
);
