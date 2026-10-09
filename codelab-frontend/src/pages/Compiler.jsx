import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import api from '../lib/api';
import toast from 'react-hot-toast';
import {
  Play, Code2, Terminal, AlertCircle, CheckCircle,
  Clock, ChevronDown, Loader, Copy, RotateCcw, Save
} from 'lucide-react';
import Editor from '@monaco-editor/react';

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript (Node.js)' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python 3' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'rust', label: 'Rust' },
  { value: 'bash', label: 'Bash' },
];

const STARTERS = {
  javascript: `// Hello World in JavaScript
console.log("Hello, CodeLab! 👋");

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log("Fibonacci(10) =", fibonacci(10));`,
  python: `# Hello World in Python
print("Hello, CodeLab! 👋")

def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)

print(f"Fibonacci(10) = {fibonacci(10)}")`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, CodeLab! 👋");
        System.out.println("Fibonacci(10) = " + fibonacci(10));
    }
    
    static int fibonacci(int n) {
        if (n <= 1) return n;
        return fibonacci(n - 1) + fibonacci(n - 2);
    }
}`,
  c: `#include <stdio.h>

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    printf("Hello, CodeLab!\\n");
    printf("Fibonacci(10) = %d\\n", fibonacci(10));
    return 0;
}`,
  cpp: `#include <iostream>
using namespace std;

int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

int main() {
    cout << "Hello, CodeLab! 👋" << endl;
    cout << "Fibonacci(10) = " << fibonacci(10) << endl;
    return 0;
}`,
};

const CompilerPage = () => {
  const [searchParams] = useSearchParams();
  const { currentProject, currentFile, saveFile } = useProject();
  const [language, setLanguage] = useState('javascript');
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [showStdin, setShowStdin] = useState(false);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);
  const [activeTab, setActiveTab] = useState('output');
  const [compilerStatus, setCompilerStatus] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api.get('/compiler/status').then((res) => {
      if (!cancelled) setCompilerStatus(res.data);
    }).catch(() => {
      if (!cancelled) setCompilerStatus({ reachable: false });
    });
    return () => { cancelled = true; };
  }, []);

  // Initialize from current file or fallback to starters
  useEffect(() => {
    if (currentFile) {
      setCode(currentFile.content || '');
      const mappedLang = currentFile.language === 'plaintext' ? 'javascript' : currentFile.language;
      // map language extension to supported compiler language if needed
      setLanguage(mappedLang);
    } else {
      setCode(STARTERS[language] || '// Write your code here\n');
    }
  }, [currentFile]);

  // Handle language switch if no file
  useEffect(() => {
    if (!currentFile) {
      setCode(STARTERS[language] || '// Write your code here\n');
    }
  }, [language, currentFile]);

  const handleSave = async () => {
    if (!currentFile || !currentProject) return;
    try {
      await saveFile(currentProject._id, currentFile.path, code);
      toast.success('File saved successfully');
    } catch (err) {
      toast.error('Failed to save file');
    }
  };

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    const toastId = toast.loading('Running code...');
    try {
      const res = await api.post('/compiler/run', {
        code,
        language,
        stdin,
        projectId: currentProject?._id,
      });
      setResult(res.data.result);
      if (res.data.result.success) {
        toast.success('Code executed successfully!', { id: toastId });
      } else {
        toast.error(`Execution failed: ${res.data.result.status}`, { id: toastId });
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Execution failed', { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  const copyOutput = () => {
    const text = result?.output || result?.stderr || '';
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="page-content" style={{ height: 'calc(100vh - 32px)', display: 'flex', flexDirection: 'column', paddingBottom: 0 }}>
      {/* Header */}
      <div className="page-header" style={{ flexShrink: 0 }}>
        <div className="page-header-top">
          <div>
            <h1 className="page-title">Compiler</h1>
            <p className="page-subtitle">Run and test your code in a sandboxed environment</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {currentFile && (
              <button
                onClick={handleSave}
                className="btn btn-secondary btn-sm"
                aria-label="Save to project file"
              >
                <Save size={13} aria-hidden="true" /> Save File
              </button>
            )}
            <button
              onClick={() => setShowStdin((p) => !p)}
              className="btn btn-secondary btn-sm"
              aria-label={showStdin ? 'Hide stdin input' : 'Show stdin input'}
            >
              <Terminal size={13} aria-hidden="true" /> {showStdin ? 'Hide' : 'Show'} Input
            </button>
            <button
              onClick={() => setCode(STARTERS[language] || '')}
              className="btn btn-ghost btn-icon"
              aria-label="Reset to starter code"
              title="Reset to starter"
            >
              <RotateCcw size={13} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {compilerStatus && compilerStatus.reachable === false && (
        <div className="alert alert-warning" style={{ flexShrink: 0 }} role="alert">
          ⚠️ Compiler service unreachable ({compilerStatus.url || 'Judge0'}). Check network or set{' '}
          <code style={{ fontFamily: 'monospace', fontSize: '0.85em', background: 'rgba(0,0,0,0.07)', padding: '1px 5px', borderRadius: 3 }}>
            JUDGE0_URL
          </code>{' '}in codelab-backend/.env.
        </div>
      )}

      {/* Language Selector */}
      <div
        className="stagger-1"
        style={{
          background: 'white',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
          Language:
        </label>
        <select
          className="form-input"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          style={{ maxWidth: '280px' }}
        >
          {SUPPORTED_LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        {result && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem' }}>
            {result.success ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--success)' }}>
                <CheckCircle size={14} /> {result.status}
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--error)' }}>
                <AlertCircle size={14} /> {result.status}
              </span>
            )}
            {result.executionTime && (
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Clock size={12} /> {result.executionTime}
              </span>
            )}
            {result.mock && (
              <span className="badge badge-neutral">Mock Mode</span>
            )}
          </div>
        )}
        <button
          className="btn btn-primary"
          onClick={handleRun}
          disabled={running}
          style={{ minWidth: '120px' }}
        >
          {running ? (
            <><Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> Running...</>
          ) : (
            <><Play size={14} /> Run Code</>
          )}
        </button>
      </div>

      <div className="stagger-2" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', minHeight: 0 }}>
        {/* Code Editor */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={14} style={{ color: 'var(--primary)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>
              {currentFile ? `Project File: ${currentFile.name}` : 'Source Code (Scratchpad)'}
            </span>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <Editor
              height="100%"
              language={language === 'c' ? 'c' : language === 'cpp' ? 'cpp' : language}
              value={code}
              onChange={(v) => setCode(v || '')}
              theme="vs"
              options={{
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                lineNumbers: 'on',
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 12 },
              }}
            />
          </div>
          {showStdin && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 14px' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'block' }}>
                STDIN (Standard Input)
              </label>
              <textarea
                className="form-input"
                value={stdin}
                onChange={(e) => setStdin(e.target.value)}
                rows={3}
                placeholder="Enter input for your program..."
                style={{ fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace' }}
              />
            </div>
          )}
        </div>

        {/* Output Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} style={{ color: 'var(--text-secondary)' }} aria-hidden="true" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Output</span>
            <div style={{ flex: 1 }} />
            {result && (
              <button onClick={copyOutput} className="btn btn-ghost btn-sm">
                <Copy size={12} /> Copy
              </button>
            )}
          </div>

          <div className="compiler-output" style={{ flex: 1, margin: '12px' }}>
            {!result && !running && (
              <span style={{ color: '#64748B', fontStyle: 'italic' }}>
                // Click "Run Code" to execute your program...
              </span>
            )}
            {running && (
              <span className="output-info">⏳ Running your code in a sandboxed environment...</span>
            )}
            {result && (
              <>
                {result.output && (
                  <div className="output-success">{result.output}</div>
                )}
                {result.stderr && (
                  <div className="output-error">{result.stderr}</div>
                )}
                {result.compilationErrors?.map((e, i) => (
                  <div key={i} className="output-error">⚠️ {e.message}</div>
                ))}
                {!result.output && !result.stderr && result.compilationErrors?.length === 0 && (
                  <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No output</span>
                )}
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', color: '#60A5FA', fontSize: '0.75rem' }}>
                  Status: {result.status}
                  {result.executionTime && ` · Time: ${result.executionTime}`}
                  {result.memoryUsed && ` · Memory: ${result.memoryUsed}`}
                  {result.mock && ' · (Mock compiler - configure Judge0 for real execution)'}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompilerPage;
