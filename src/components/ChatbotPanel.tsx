import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Copy, Check, Terminal, Cpu, ArrowUpRight } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

interface ChatbotPanelProps {
  onInjectCodeToEditor: (code: string) => void;
}

export const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ onInjectCodeToEditor }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: `Hello! I am your Autonomous Blender Technical Director & bpy Pipeline Architect. 
I specialize in Direct Data API programming, pure bmesh manifolds, headless Cycles/EEVEE rendering, and physical simulations.

How can I assist your 3D pipeline today? You can ask me to:
- Write custom procedural math curves or bmesh topologies.
- Audit a script for headless context errors or orphaned bmesh memory leaks.
- Setup complex camera trajectories, cloth baking, or 3-point softbox rigs.`,
      timestamp: 'Ready',
    },
  ]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState<'technical_director' | 'script_optimizer' | 'renderjuice_artist'>('technical_director');
  const [model, setModel] = useState<'gemini-4-argon' | 'gemini-3.8-flash' | 'gemini-3.1-flash-lite'>('gemini-4-argon');
  const [useThinking, setUseThinking] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          model,
          role,
          useThinking: model === 'gemini-4-argon' ? useThinking : false,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to receive model response');
      }

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      const errMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: `Error communicating with Gemini: ${err.message || 'Network error'}`,
        timestamp: 'Failed',
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render message with formatted Python code blocks
  const renderMessageContent = (text: string, msgId: string) => {
    const parts = text.split(/(```python[\s\S]*?```|```[\s\S]*?```)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('```')) {
        const cleanCode = part.replace(/^```(python)?\s*/i, '').replace(/\s*```$/, '');
        const blockId = `${msgId}-block-${idx}`;

        return (
          <div key={idx} className="my-2.5 rounded-lg overflow-hidden border border-slate-700/80 bg-slate-950">
            <div className="bg-slate-900/90 px-3 py-1.5 flex items-center justify-between border-b border-slate-800 text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Terminal className="w-3.5 h-3.5" />
                Blender Python (bpy) Snippet
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyCode(cleanCode, blockId)}
                  className="hover:text-white flex items-center gap-1 transition"
                >
                  {copiedId === blockId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === blockId ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  onClick={() => onInjectCodeToEditor(cleanCode)}
                  className="hover:text-cyan-400 flex items-center gap-1 text-slate-300 transition"
                  title="Send to Main Code Inspector"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Send to Editor</span>
                </button>
              </div>
            </div>
            <pre className="p-3 text-xs font-mono text-cyan-200 overflow-x-auto whitespace-pre leading-relaxed">
              <code>{cleanCode}</code>
            </pre>
          </div>
        );
      }

      return (
        <span key={idx} className="whitespace-pre-wrap leading-relaxed">
          {part}
        </span>
      );
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[640px] shadow-xl overflow-hidden">
      {/* Header & Role Bar */}
      <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-200">Gemini 3D TD Chatbot</h3>
            <p className="text-[10px] text-slate-400">Multi-turn technical consultation & code synthesis</p>
          </div>
        </div>

        {/* Persona Switcher */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="technical_director">Principal 3D TD</option>
            <option value="script_optimizer">Script & Memory Optimizer</option>
            <option value="renderjuice_artist">RenderJuice Artist</option>
          </select>

          <select
            value={model}
            onChange={(e) => setModel(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="gemini-4-argon">gemini-4-argon</option>
            <option value="gemini-3.8-flash">gemini-3.8-flash</option>
            <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite</option>
          </select>
        </div>
      </div>

      {/* Message Thread */}
      <div ref={scrollRef} className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((m) => {
          const isBot = m.role === 'model';
          return (
            <div key={m.id} className={`flex gap-3 ${isBot ? 'items-start' : 'items-start flex-row-reverse'}`}>
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  isBot
                    ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950'
                    : 'bg-slate-700 text-slate-200'
                }`}
              >
                {isBot ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-xl p-3 text-xs ${
                  isBot
                    ? 'bg-slate-950/80 border border-slate-800 text-slate-200'
                    : 'bg-cyan-600 text-white font-medium shadow-md'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1 text-[10px] text-slate-400">
                  <span className="font-semibold text-cyan-400">
                    {isBot ? (role === 'technical_director' ? 'Principal 3D TD' : role === 'script_optimizer' ? 'Memory Optimizer' : 'RenderJuice Artist') : 'You'}
                  </span>
                  <span>{m.timestamp}</span>
                </div>
                <div>{renderMessageContent(m.text, m.id)}</div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 items-center text-xs text-slate-400 bg-slate-950/40 p-3 rounded-lg border border-slate-800 w-fit">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
            <span>Gemini Technical Director is calculating shader graph & geometry math...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Ask TD: 'How do I add a cloth collision pin group?' or 'Generate a neon speed trail'..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition text-xs cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Targeting headless `bpy` execution without UI viewport context</span>
          {model === 'gemini-4-argon' && (
            <label className="flex items-center gap-1 text-cyan-400 cursor-pointer">
              <input
                type="checkbox"
                checked={useThinking}
                onChange={(e) => setUseThinking(e.target.checked)}
                className="accent-cyan-400 w-3 h-3"
              />
              <span>High Thinking Level Active</span>
            </label>
          )}
        </div>
      </div>
    </div>
  );
};
