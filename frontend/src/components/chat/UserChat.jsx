'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import { motion } from 'framer-motion';
import { Send, Loader2 } from 'lucide-react';
import Image from 'next/image';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';

function formatTime(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function UserChat() {
  const searchParams = useSearchParams();
  const { user } = useSelector((state) => state.auth);
  const initialConversationId = searchParams.get('conversationId');
  const initialProductId = searchParams.get('productId');

  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(initialConversationId || null);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId || null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/api/chat/conversations');
      const list = res.data?.conversations || [];
      setConversations(list);
      if (!selectedConversationId && list.length > 0) {
        setSelectedConversationId(list[0]._id);
      }
    } catch {}
  };

  const fetchMessages = async (conversationId = selectedConversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    try {
      setLoading(true);
      const res = await api.get(`/api/chat/messages/${conversationId}`);
      setMessages(res.data?.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    fetchMessages(selectedConversationId);
  }, [selectedConversationId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    const handleNewMessage = (incoming) => {
      if (!incoming) return;
      if (String(incoming.conversationId) !== String(selectedConversationId)) return;
      setMessages((prev) => {
        const exists = prev.some((m) => String(m._id) === String(incoming._id));
        if (exists) return prev;
        return [...prev, incoming];
      });
    };

    const handleConversationUpdated = (updated) => {
      if (!updated?._id) return;
      setConversations((prev) => {
        const next = [...prev];
        const idx = next.findIndex((c) => String(c._id) === String(updated._id));
        if (idx >= 0) {
          next[idx] = updated;
        } else {
          next.unshift(updated);
        }
        next.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        return next;
      });
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('conversationUpdated', handleConversationUpdated);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('conversationUpdated', handleConversationUpdated);
    };
  }, [selectedConversationId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    if (!selectedConversationId) return;
    socket.emit('joinConversation', selectedConversationId);
    return () => {
      socket.emit('leaveConversation', selectedConversationId);
    };
  }, [selectedConversationId]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c._id === selectedConversationId),
    [conversations, selectedConversationId]
  );

  const handleSend = async (e) => {
    e.preventDefault();
    if (!selectedConversationId || !input.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/api/chat/message', {
        conversationId: selectedConversationId,
        text: input.trim(),
        productId: selectedProductId || undefined,
      });
      const sent = res.data?.message;
      if (sent) {
        setMessages((prev) => {
          const exists = prev.some((m) => String(m._id) === String(sent._id));
          if (exists) return prev;
          return [...prev, sent];
        });
      }
      setInput('');
    } finally {
      setSending(false);
    }
  };

  const getOtherUser = (conversation) => {
    if (!conversation || !user) return null;
    const seller = conversation.sellerId;
    const renter = conversation.renterId;
    if (!seller || !renter) return null;
    const isSeller = String(seller._id) === String(user.id);
    return isSeller ? renter : seller;
  };

  return (
    <>
      <header className="mb-8">
        <h1 className="text-4xl font-black tracking-tighter text-foreground mb-2">User Chat</h1>
        <p className="text-muted-foreground">Chat directly with renters and sellers.</p>
      </header>

      <div className="bg-card rounded-[40px] border border-border shadow-sm dark:shadow-black/20 grid md:grid-cols-[340px_1fr] h-[72vh] overflow-hidden">
        <aside className="border-r border-border overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No conversations yet.</div>
          ) : (
            <div className="p-3 space-y-2">
              {conversations.map((conv) => {
                const other = getOtherUser(conv);
                return (
                  <button
                    key={conv._id}
                    onClick={() => setSelectedConversationId(conv._id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-colors ${
                      selectedConversationId === conv._id
                        ? 'border-emerald-500 dark:border-cyan-500 bg-emerald-50/60 dark:bg-cyan-900/20'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 rounded-full overflow-hidden bg-muted">
                        {other?.avatar ? (
                          <Image src={other.avatar} alt={other.name || 'User'} fill className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-sm font-bold text-muted-foreground">
                            {(other?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-foreground truncate">{other?.name || 'User'}</p>
                        <p className="text-xs text-muted-foreground truncate">{conv.lastMessage || 'No messages yet'}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <section className="flex flex-col">
          <div className="border-b border-border px-5 py-4">
            <p className="font-bold text-foreground">
              {getOtherUser(selectedConversation)?.name || 'Select conversation'}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No messages yet.
              </div>
            ) : (
              messages.map((msg) => {
                const mine = String(msg.senderId?._id || msg.senderId) === String(user?.id);
                return (
                  <motion.div
                    key={msg._id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm ${
                        mine
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted text-foreground rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                      {msg.productId && (
                        <div className="mt-2 p-2 rounded-xl border border-border/50 bg-background/60">
                          <p className="text-xs font-bold text-foreground truncate">{msg.productId.title}</p>
                          <p className="text-[11px] text-muted-foreground">₹{msg.productId.pricePerDay}/day</p>
                        </div>
                      )}
                      <p className={`mt-1 text-[10px] ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTime(msg.createdAt)}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          <form onSubmit={handleSend} className="border-t border-border p-4 flex gap-3 bg-card">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={selectedConversationId ? 'Type your message...' : 'Select a conversation'}
              disabled={!selectedConversationId || sending}
              className="flex-1 bg-input border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring outline-none transition-all disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!selectedConversationId || !input.trim() || sending}
              className="px-4 py-3 rounded-2xl bg-emerald-600 dark:bg-cyan-600 text-white flex items-center gap-2 text-sm font-bold hover:bg-emerald-500 dark:hover:bg-cyan-500 disabled:opacity-60"
            >
              {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
