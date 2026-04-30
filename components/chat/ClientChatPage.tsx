'use client';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatInput from '@/components/chat/ChatInput';

interface Message { role: 'user' | 'assistant'; content: string; sources?: string[]; }
interface Brand { label: string; iconDataUrl: string; }

export default function ClientChatPage({ slug }: { slug: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [brand, setBrand] = useState<Brand>({ label: 'Chatbot AI', iconDataUrl: '' });

  useEffect(() => {
    const key = `chat_session_${slug}`;
    let id = localStorage.getItem(key);
    if (!id) { id = uuidv4(); localStorage.setItem(key, id); }
    setSessionId(id);
  }, [slug]);

  useEffect(() => {
    if (!sessionId) return;
    setHistoryLoading(true);
    fetch(`/c/${slug}/api/chat?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(d => { if (d.messages?.length) setMessages(d.messages); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [sessionId, slug]);

  useEffect(() => {
    fetch(`/c/${slug}/api/config`)
      .then(r => r.json())
      .then(d => setBrand({ label: d.label || 'Chatbot AI', iconDataUrl: d.iconDataUrl || '' }))
      .catch(() => {});
  }, [slug]);

  const handleSend = async (message: string) => {
    if (!sessionId) return;
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);

    // Add empty assistant message immediately — will be filled by stream
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const res = await fetch(`/c/${slug}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        setMessages(prev => {
          const msgs = [...prev];
          msgs[msgs.length - 1] = { role: 'assistant', content: data.error ?? 'Something went wrong.' };
          return msgs;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // Process all complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? ''; // keep incomplete last line

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const event = JSON.parse(line);
            if (event.t === 'delta') {
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = {
                  ...msgs[msgs.length - 1],
                  content: msgs[msgs.length - 1].content + event.v,
                };
                return msgs;
              });
            } else if (event.t === 'done') {
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], sources: event.sources ?? [] };
                return msgs;
              });
            } else if (event.t === 'error') {
              setMessages(prev => {
                const msgs = [...prev];
                msgs[msgs.length - 1] = { role: 'assistant', content: event.v ?? 'Something went wrong.' };
                return msgs;
              });
            }
          } catch { /* malformed line — skip */ }
        }
      }
    } catch {
      setMessages(prev => {
        const msgs = [...prev];
        msgs[msgs.length - 1] = { role: 'assistant', content: 'Network error. Please try again.' };
        return msgs;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="flex items-center px-6 py-4 border-b border-gray-200">
        {brand.iconDataUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={brand.iconDataUrl} alt="logo" className="w-7 h-7 object-contain rounded mr-2" />
        )}
        <h1 className="text-lg font-semibold text-gray-900">{brand.label}</h1>
      </header>

      <ChatWindow messages={messages} isLoading={isLoading || historyLoading} />

      <div className="flex justify-center py-2 border-t border-gray-100">
        <a href="https://www.framelink.co" target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://www.dropbox.com/scl/fi/422fj8txovd9bb9031hl2/FLSite.png?rlkey=e7iyb8pca6931kq7a19gx6514&raw=1"
            alt="©2026 FrameLink" style={{ width: 90, verticalAlign: 'middle' }} />
        </a>
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading || historyLoading || !sessionId} />
    </div>
  );
}
