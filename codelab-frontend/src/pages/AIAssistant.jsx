import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../contexts/ProjectContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { Bot, Send, User, RefreshCw, Sparkles, Copy, Check } from 'lucide-react';

const QUICK_PROMPTS = [
  { label: '✨ Explain this code',       prompt: 'Please explain what the currently open file does.' },
  { label: '🔐 Security issues',         prompt: 'What security vulnerabilities might exist in my project?' },
  { label: '🚀 Optimize performance',    prompt: 'How can I improve the performance of my code?' },
  { label: '📋 Best practices',          prompt: 'What coding best practices should I apply to improve code quality?' },
  { label: '🧪 Write tests',             prompt: 'Can you help me write unit tests for my code?' },
];

const TypingIndicator = () => (
  <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '10px 2px' }}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--text-muted)',
          animation: `typingDot 1.2s ${i * 0.2}s ease-in-out infinite`,
        }}
      />
    ))}
  </div>
);

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      style={{
        position: 'absolute', top: 8, right: 8,
        background: 'rgba(255,255,255,0.15)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 'var(--radius-xs)', padding: '3px 7px',
        cursor: 'pointer', color: 'rgba(255,255,255,0.8)',
        fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: 4,
        transition: 'all 0.15s',
      }}
      aria-label={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const formatMessage = (content) => {
  // Handle code blocks
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const lines = part.split('\n');
      const lang = lines[0].replace('```', '').trim() || 'code';
      const code = lines.slice(1, -1).join('\n');
      return (
        <div key={i} style={{ position: 'relative', margin: '8px 0' }}>
          <div style={{
            background: '#0E1117', borderRadius: 'var(--radius-sm)',
            padding: '12px 40px 12px 14px',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.78rem', color: '#CDD9E5', lineHeight: 1.7,
            overflowX: 'auto', whiteSpace: 'pre',
          }}>
            {lang !== 'code' && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                {lang}
              </div>
            )}
            {code}
          </div>
          <CopyButton text={code} />
        </div>
      );
    }
    // Inline formatting
    const html = part
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.08);padding:2px 5px;border-radius:3px;font-family:\'JetBrains Mono\',monospace;font-size:0.85em">$1</code>')
      .replace(/\n/g, '<br/>');
    return <span key={i} dangerouslySetInnerHTML={{ __html: html }} />;
  });
};

const AIAssistant = () => {
  const { currentProject, currentFile } = useProject();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello! I'm **CodeLab AI** 👋\n\nI can help you analyze and improve your code:\n\n• **Explain code** — Understand complex logic\n• **Find issues** — Bugs and security vulnerabilities\n• **Suggest fixes** — Actionable solutions\n• **Code review** — Best practices check\n• **Answer questions** — Any coding questions\n\n${currentProject ? `I can see you're working on **${currentProject.name}**. ` : 'Open a project so I can provide context-aware help. '}What would you like help with?`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    api.get('/ai/status').then((r) => setAiConfigured(r.data.configured)).catch(() => setAiConfigured(false));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (content = input) => {
    if (!content.trim() || loading) return;
    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const context = currentProject
        ? `Project: ${currentProject.name}\nLanguages: ${currentProject.languages?.map((l) => l.language).join(', ')}\nFiles: ${currentProject.files?.length || 0}\nCurrent file: ${currentFile?.name || 'none'}\nIssues: ${currentProject.currentAnalysis?.totalIssues || 0}`
        : '';
      const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));
      const res = await api.post('/ai/chat', { messages: apiMessages, projectId: currentProject?._id, context });
      if (res.data.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: res.data.message }]);
      } else {
        throw new Error(res.data.message);
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'AI request failed';
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ **Error:** ${errMsg}\n\nMake sure your OpenRouter API key is configured in the backend \`.env\` file.` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content" style={{ height: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-top">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative' }}>
              <div style={{
                position: 'absolute', inset: -8,
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.4), transparent 70%)',
                borderRadius: '50%',
                animation: 'blobFloat 6s infinite alternate',
                zIndex: 0
              }} aria-hidden="true" />
              <div style={{
                position: 'relative', zIndex: 1,
                width: 38, height: 38,
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                borderRadius: 'var(--radius)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', flexShrink: 0,
                boxShadow: '0 4px 12px rgba(79,70,229,0.25)',
              }} aria-hidden="true">
                <Sparkles size={18} />
              </div>
            </div>
            <div>
              <h1 className="page-title" style={{ fontSize: '1.375rem' }}>AI Assistant</h1>
              <p className="page-subtitle" style={{ marginTop: 0 }}>
                Powered by OpenRouter
                {!aiConfigured && ' · API key not configured'}
              </p>
            </div>
          </div>
          <div>
            {aiConfigured
              ? <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>● AI Active</span>
              : <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>⚠ Not Configured</span>}
          </div>
        </div>
      </div>

      {!aiConfigured && (
        <div className="alert alert-warning" style={{ flexShrink: 0 }} role="alert">
          <strong>AI not configured.</strong> Add your OpenRouter API key to{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.85em', background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3 }}>
            codelab-backend/.env
          </code>
          : <code style={{ fontFamily: 'monospace', fontSize: '0.85em', background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3 }}>
            OPENROUTER_API_KEY=sk-or-...
          </code>
        </div>
      )}

      {/* Quick Prompts */}
      <div className="stagger-1" style={{ display: 'flex', gap: 7, marginBottom: 14, flexWrap: 'wrap', flexShrink: 0 }}>
        {QUICK_PROMPTS.map((qp) => (
          <button
            key={qp.label}
            className="btn btn-secondary btn-sm"
            onClick={() => sendMessage(qp.prompt)}
            disabled={loading}
            aria-label={`Quick prompt: ${qp.label}`}
            style={{ fontSize: '0.78rem' }}
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Chat Container */}
      <div className="stagger-2" style={{
        flex: 1,
        background: 'white',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0,
        boxShadow: 'var(--shadow-sm)',
      }}>
        {/* Messages */}
        <div
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}
        >
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 16,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                animation: 'fadeUp 0.2s ease',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: msg.role === 'user'
                  ? 'var(--primary)'
                  : 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', flexShrink: 0, fontSize: '0.7rem',
              }} aria-hidden="true">
                {msg.role === 'user' ? <User size={13} /> : <Bot size={13} />}
              </div>

              {/* Bubble */}
              <div
                className={`chat-message ${msg.role}`}
                style={{ maxWidth: '76%' }}
              >
                {formatMessage(msg.content)}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', flexShrink: 0,
              }} aria-hidden="true">
                <Bot size={13} />
              </div>
              <div className="chat-message assistant" style={{ padding: '8px 14px' }}>
                <TypingIndicator />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="chat-input-area">
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              className="chat-input"
              placeholder={aiConfigured ? 'Ask anything about your code...' : 'Configure API key first...'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={loading}
              rows={2}
              aria-label="Chat input"
              style={{ resize: 'none', flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              aria-label={loading ? 'Sending...' : 'Send message'}
              style={{ alignSelf: 'flex-end', width: 44, height: 44, padding: 0, flexShrink: 0 }}
            >
              {loading
                ? <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
                : <Send size={15} aria-hidden="true" />}
            </button>
          </div>
          <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
