import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Upload, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';

const UploadDocs = ({ namespace }) => {
  const [text, setText] = useState('');
  const [status, setStatus] = useState('idle'); // idle, uploading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [metadataList, setMetadataList] = useState([{ key: 'source', value: 'user-upload' }]);
  const [uploadedFile, setUploadedFile] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setUploadedFile(file);
      
      // For text files, show preview
      if (file.type.startsWith('text/') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = () => {
          setText(reader.result);
        };
        reader.readAsText(file);
      } else if (file.name.endsWith('.pdf')) {
        setText(`PDF file: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop, 
    accept: { 
      'text/*': ['.txt', '.md', '.json', '.csv'], 
      'application/json': ['.json'],
      'application/pdf': ['.pdf']
    },
    multiple: false
  });

  const handleMetadataChange = (index, field, value) => {
    const newList = [...metadataList];
    newList[index][field] = value;
    setMetadataList(newList);
  };

  const addMetadataField = () => {
    setMetadataList([...metadataList, { key: '', value: '' }]);
  };

  const removeMetadataField = (index) => {
    const newList = [...metadataList];
    newList.splice(index, 1);
    setMetadataList(newList);
  };

  const handleUpload = async () => {
    setStatus('uploading');
    setErrorMessage('');
    
    // Convert metadata list to object
    const metadataObj = {};
    metadataList.forEach(item => {
      if (item.key.trim()) {
        metadataObj[item.key.trim()] = item.value;
      }
    });

    try {
      if (uploadedFile) {
        // File upload via FormData
        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('namespace', namespace);
        formData.append('metadata', JSON.stringify(metadataObj));

        await axios.post('http://localhost:8000/ingest/file', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else if (text.trim()) {
        // Text upload via JSON
        await axios.post('http://localhost:8000/ingest', {
          text,
          metadata: metadataObj,
          namespace
        });
      } else {
        setStatus('error');
        setErrorMessage('Please provide text or upload a file');
        return;
      }

      setStatus('success');
      setText('');
      setUploadedFile(null);
      // Reset metadata to default
      setMetadataList([{ key: 'source', value: 'user-upload' }]);
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

      {/* Metadata Section */}
      <div style={{ marginBottom: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#94a3b8' }}>Metadata</label>
        {metadataList.map((item, index) => (
          <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Key (e.g., author)"
              value={item.key}
              onChange={(e) => handleMetadataChange(index, 'key', e.target.value)}
              style={{ flex: 1 }}
            />
            <input
              type="text"
              className="input-field"
              placeholder="Value (e.g., John Doe)"
              value={item.value}
              onChange={(e) => handleMetadataChange(index, 'value', e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              onClick={() => removeMetadataField(index)}
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '0.375rem', padding: '0.5rem', cursor: 'pointer' }}
              title="Remove field"
            >
              <X size={16} />
            </button>
          </div>
        ))}
        <button
          onClick={addMetadataField}
          style={{ fontSize: '0.875rem', color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
        >
          + Add Metadata Field
        </button>
      </div>

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
