import React, { useState } from 'react';
import ChatWindow from './components/ChatWindow';
import UploadDocs from './components/UploadDocs';
import { Settings, MessageSquare } from 'lucide-react';

function App() {
  const [namespace, setNamespace] = useState('default');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div style={{ maxWidth: '56rem', margin: '0 auto', padding: '1rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: '#2563eb', padding: '0.5rem', borderRadius: '0.5rem' }}>
            <MessageSquare size={24} color="white" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', background: 'linear-gradient(to right, #60a5fa, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            RAG Chatbot
          </h1>
        </div>
        
        <button 
          onClick={() => setShowSettings(!showSettings)}
          style={{ padding: '0.5rem', borderRadius: '9999px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'white' }}
        >
          <Settings size={24} />
        </button>
      </header>

      {showSettings && (
        <div className="glass-panel" style={{ padding: '1rem', marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>Namespace</label>
          <input 
            type="text" 
            value={namespace} 
            onChange={(e) => setNamespace(e.target.value)}
            className="input-field"
            placeholder="Enter namespace..."
          />
        </div>
      )}

      <UploadDocs namespace={namespace} />
      <ChatWindow namespace={namespace} />
    </div>
  );
}

export default App;
