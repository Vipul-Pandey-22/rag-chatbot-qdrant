import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const ChatWindow = ({ namespace }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => 'session-' + Math.random().toString(36).substr(2, 9));
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

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
        namespace
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
                      <li key={i}>{s.source || 'Unknown'} (Namespace: {s.namespace})</li>
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
