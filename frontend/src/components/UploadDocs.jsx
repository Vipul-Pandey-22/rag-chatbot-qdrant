import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';

const UploadDocs = ({ namespace }) => {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState('');

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setText(reader.result);
      };
      reader.readAsText(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 'text/*': ['.txt', '.md', '.json', '.csv'], 'application/json': ['.json'] },
    multiple: false
  });

  const handleUpload = async () => {
    if (!text.trim()) return;
    setStatus('uploading');
    setErrorMessage('');
    try {
      await axios.post('http://localhost:8000/ingest', {
        text,
        metadata: { source: 'user-upload' },
        namespace
      });
      setStatus('success');
      setText('');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage(error.response?.data?.detail || error.message || "Failed to upload");
    }
  };

  return (
    <div className="glass-panel p-6 mb-6" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Upload size={20} /> Ingest Documents
      </h2>
      
      <div 
        {...getRootProps()} 
        style={{ 
          border: '2px dashed ' + (isDragActive ? 'var(--primary-color)' : 'var(--glass-border)'), 
          borderRadius: '0.5rem', 
          padding: '1rem', 
          marginBottom: '1rem', 
          textAlign: 'center', 
          cursor: 'pointer',
          background: isDragActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
          transition: 'all 0.2s'
        }}
      >
        <input {...getInputProps()} />
        {text ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <FileText size={20} />
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
              Document loaded ({text.length} chars)
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); setText(''); }}
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <p style={{ color: '#94a3b8', margin: 0 }}>
            {isDragActive ? "Drop the file here..." : "Drag & drop a text file here, or click to select"}
          </p>
        )}
      </div>

      <textarea
        className="input-field"
        style={{ height: '8rem', marginBottom: '1rem', resize: 'none', fontFamily: 'monospace', fontSize: '0.875rem' }}
        placeholder="Or paste document text here..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button 
          className="btn"
          onClick={handleUpload}
          disabled={status === 'uploading' || !text.trim()}
          style={{ opacity: (status === 'uploading' || !text.trim()) ? 0.5 : 1 }}
        >
          {status === 'uploading' ? 'Ingesting...' : 'Ingest Text'}
        </button>
        
        <AnimatePresence>
          {status === 'success' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: '#4ade80', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <CheckCircle size={18} /> Ingested!
            </motion.div>
          )}
          
          {status === 'error' && (
            <motion.div 
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              style={{ color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <AlertCircle size={18} /> {errorMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UploadDocs;
