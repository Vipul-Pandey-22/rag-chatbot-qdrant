import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatWindow = ({ namespace }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 'session-' + Math.random().toString(36).substr(2, 9));
  const [metadataStats, setMetadataStats] = useState(null);
  const [activeFilters, setActiveFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  // Fetch metadata stats when namespace changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get('http://localhost:8000/metadata/stats', {
          params: { namespace }
        });
        setMetadataStats(res.data);
      } catch (error) {
        console.error("Failed to fetch metadata stats:", error);
      }
    };
    fetchStats();
    // Reset filters when namespace changes
    setActiveFilters({});
  }, [namespace]);

  const handleFilterChange = (key, value) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      if (value === "") {
        delete newFilters[key];
      } else {
        newFilters[key] = value;
      }
      return newFilters;
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await axios.post('http://localhost:8000/chat', {
        query: userMsg.text,
        session_id: sessionId,
        namespace,
        metadata_filters: Object.keys(activeFilters).length > 0 ? activeFilters : null
      });
      
      const botMsg = { role: 'bot', text: res.data.answer, sources: res.data.sources };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I encountered an error." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
      {/* Filters Section */}
      <div style={{ padding: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <button 
          onClick={() => setShowFilters(!showFilters)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#94a3b8', 
            cursor: 'pointer', 
            fontSize: '0.875rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}
        >
          <span>{showFilters ? '▼' : '▶'}</span> Advanced Filters
          {Object.keys(activeFilters).length > 0 && (
            <span style={{ background: '#3b82f6', color: 'white', padding: '0.1rem 0.4rem', borderRadius: '9999px', fontSize: '0.75rem' }}>
              {Object.keys(activeFilters).length}
            </span>
          )}
        </button>
        
        {showFilters && metadataStats && metadataStats.metadata_keys && (
          <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {Object.entries(metadataStats.metadata_keys).map(([key, values]) => (
              <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{key}</label>
                <select
                  className="input-field"
                  style={{ padding: '0.25rem', fontSize: '0.875rem', minWidth: '120px' }}
                  value={activeFilters[key] || ""}
                  onChange={(e) => handleFilterChange(key, e.target.value)}
                >
                  <option value="">All</option>
                  {values.map(val => (
                    <option key={val} value={val}>{val}</option>
                  ))}
                </select>
              </div>
            ))}
            {Object.keys(metadataStats.metadata_keys).length === 0 && (
              <p style={{ fontSize: '0.875rem', color: '#64748b' }}>No metadata available for filtering.</p>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', marginTop: '5rem' }}>
            <Bot size={48} style={{ margin: '0 auto 0.5rem auto', opacity: 0.5 }} />
            <p>Start a conversation with your documents.</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <motion.div 
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}
          >
            <div style={{ padding: '0.5rem', borderRadius: '9999px', height: '2.5rem', width: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.role === 'user' ? '#2563eb' : '#334155' }}>
              {msg.role === 'user' ? <User size={20} /> : <Bot size={20} />}
            </div>
            
            <div style={{ maxWidth: '80%', padding: '0.75rem', borderRadius: '0.5rem', background: msg.role === 'user' ? 'rgba(37, 99, 235, 0.2)' : 'rgba(51, 65, 85, 0.3)', border: msg.role === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(71, 85, 105, 0.3)' }}>
              <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>
              {msg.sources && msg.sources.length > 0 && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #374151', paddingTop: '0.5rem' }}>
                  <strong>Sources:</strong>
                  <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem' }}>
                    {msg.sources.map((s, i) => (
                      <li key={i}>
                        {/* Display metadata badges */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginBottom: '0.25rem' }}>
                          {Object.entries(s).map(([k, v]) => {
                            if (k === 'text' || k === 'namespace') return null;
                            return (
                              <span key={k} style={{ background: '#334155', padding: '0.1rem 0.3rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                                {k}: {v}
                              </span>
                            );
                          })}
                        </div>
                        <span style={{ opacity: 0.8 }}>{s.text ? s.text.substring(0, 100) + '...' : 'No text content'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {loading && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
             <div style={{ padding: '0.5rem', borderRadius: '9999px', height: '2.5rem', width: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#334155' }}>
              <Bot size={20} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <Loader2 className="animate-spin" size={24} color="#60a5fa" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            className="input-field"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button 
            className="btn"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            style={{ opacity: (loading || !input.trim()) ? 0.5 : 1 }}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
