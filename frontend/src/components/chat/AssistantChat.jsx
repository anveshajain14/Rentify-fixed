'use client';

import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import api from '@/lib/api';

function normalizeAssistantText(data) {
  if (!data) return 'No response received.';
  if (typeof data.text === 'string' && data.text.trim()) return data.text;
  if (typeof data.response === 'string' && data.response.trim()) return data.response;
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  return 'No response text returned by assistant.';
}

export default function AssistantChat() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    const query = input.trim();
    if (!query || sending) return;

    const userMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setSending(true);

    try {
      const res = await api.post('/api/ai/chat', { query });
      const data = res.data || {};
      const assistantMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: normalizeAssistantText(data),
        items: Array.isArray(data.items) ? data.items : [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage = {
        id: `e-${Date.now()}`,
        role: 'assistant',
        text: err?.response?.data?.message || 'Assistant is temporarily unavailable.',
        items: [],
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">AI Assistant</h1>
        <p className="text-muted-foreground">Ask policy questions and get product suggestions instantly.</p>
      </header>

      <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 h-[72vh] overflow-hidden flex flex-col">
        <div className="border-b border-border px-5 py-4">
          <p className="font-bold text-foreground">Rentify Assistant</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Start a conversation with your AI assistant.
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.role === 'assistant' && msg.items?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.items.slice(0, 5).map((item, index) => (
                        <div key={`${item._id || item.title || 'item'}-${index}`} className="rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                          <p className="font-semibold text-foreground text-xs truncate">{item.title || 'Recommended item'}</p>
                          {item.price && <p className="text-[11px] text-muted-foreground">{item.price}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={sendMessage} className="border-t border-border p-4 flex gap-3 bg-card">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the assistant anything..."
            disabled={sending}
            className="flex-1 bg-input border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="px-4 py-3 rounded-2xl bg-emerald-600 dark:bg-cyan-600 text-white flex items-center gap-2 text-sm font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500 disabled:opacity-60"
          >
            {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </>
  );
}
