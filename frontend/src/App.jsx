import { useState, useEffect } from 'react';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import './index.css';

const API_BASE = 'http://localhost:3001';

const SUGGESTIONS = [
  '🔑 How do I reset my password?',
  '💳 What are the subscription plans?',
  '🔐 How do I enable two-factor authentication?',
  '📦 What are the file storage limits?',
  '♻️ What is the refund policy?',
];

function App() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // ── Initialise / restore session ──────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('rag_session_id');
    if (stored) {
      setSessionId(stored);
    } else {
      createNewSession();
    }
  }, []);

  async function createNewSession() {
    try {
      const res = await fetch(`${API_BASE}/api/session/new`, { method: 'POST' });
      const data = await res.json();
      setSessionId(data.sessionId);
      localStorage.setItem('rag_session_id', data.sessionId);
    } catch {
      // Fallback: generate a client-side UUID
      const id = crypto.randomUUID();
      setSessionId(id);
      localStorage.setItem('rag_session_id', id);
    }
  }

  // ── Start new chat ─────────────────────────────────────────────────────────
  async function handleNewChat() {
    if (sessionId) {
      try {
        await fetch(`${API_BASE}/api/session/${sessionId}`, { method: 'DELETE' });
      } catch { /* ignore */ }
    }
    setMessages([]);
    setError(null);
    localStorage.removeItem('rag_session_id');
    await createNewSession();
  }

  // ── Send message ──────────────────────────────────────────────────────────
  async function handleSend(text) {
    if (!text.trim() || isLoading) return;
    setError(null);

    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error (${res.status})`);
      }

      const data = await res.json();
      const aiMsg = {
        role: 'ai',
        content: data.reply,
        timestamp: new Date().toISOString(),
        tokensUsed: data.tokensUsed,
        retrievedChunks: data.retrievedChunks,
        scores: data.scores,
        fallback: data.fallback,
        latencyMs: data.latencyMs,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSuggestion(text) {
    const cleaned = text.replace(/^[\p{Emoji}\s]+/u, '').trim();
    handleSend(cleaned);
  }

  return (
    <div className="app">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="logo-icon">🤖</div>
          <span>RAG Assistant</span>
        </div>

        <button className="new-chat-btn" onClick={handleNewChat}>
          ✦ New Chat
        </button>

        <div className="sidebar-info">
          <div className="badge">
            <span className="badge-dot" />
            Gemini Powered
          </div>
          <p>Answers grounded in your knowledge base via real embedding-based retrieval.</p>
        </div>
      </aside>

      {/* ── Main chat ──────────────────────────────────────────────────── */}
      <main className="chat-main">
        <div className="chat-header">
          <div>
            <h2>Support Assistant</h2>
            <p>Powered by RAG · Knowledge base: 10 documents</p>
          </div>
          <div className="model-badge">⚡ gemini-2.5-flash</div>
        </div>

        <ChatWindow
          messages={messages}
          isLoading={isLoading}
          suggestions={SUGGESTIONS}
          onSuggestion={handleSuggestion}
        />

        {error && (
          <div className="error-banner">
            ⚠️ {error}
          </div>
        )}

        <ChatInput onSend={handleSend} isLoading={isLoading} />
      </main>
    </div>
  );
}

export default App;
