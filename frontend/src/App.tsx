import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { UploadDocument } from './pages/UploadDocument';
import { ReviewVerification } from './pages/ReviewVerification';

export const App: React.FC = () => {
  const [view, setView] = useState<'dashboard' | 'upload' | 'review'>('dashboard');
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);

  const handleSelectDocument = (docId: number) => {
    setSelectedDocId(docId);
    setView('review');
  };

  const handleUploadSuccess = (docId: number) => {
    setSelectedDocId(docId);
    setView('review');
  };

  return (
    <div className="app-container">
      <Navbar
        currentView={view}
        onNavigate={(v) => {
          setView(v);
          setSelectedDocId(null);
        }}
      />

      <main className="main-content">
        {view === 'dashboard' && (
          <Dashboard
            onSelectDocument={handleSelectDocument}
            onNavigateUpload={() => setView('upload')}
          />
        )}

        {view === 'upload' && (
          <UploadDocument
            onBack={() => setView('dashboard')}
            onSuccess={handleUploadSuccess}
          />
        )}

        {view === 'review' && selectedDocId && (
          <ReviewVerification
            documentId={selectedDocId}
            onBack={() => {
              setView('dashboard');
              setSelectedDocId(null);
            }}
            onRecordVerified={() => {
              // Stay on review or allow refreshing
            }}
          />
        )}
      </main>
    </div>
  );
};

export default App;
