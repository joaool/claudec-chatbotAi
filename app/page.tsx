'use client';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatInput from '@/components/chat/ChatInput';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

interface BrandConfig {
  label: string;
  iconDataUrl: string;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [brand, setBrand] = useState<BrandConfig>({ label: process.env.NEXT_PUBLIC_APP_NAME ?? 'Chatbot AI', iconDataUrl: '' });

  // Initialize sessionId — persisted in localStorage so it survives tab closes
  useEffect(() => {
    let id = localStorage.getItem('chat_session_id');
    if (!id) {
      id = uuidv4();
      localStorage.setItem('chat_session_id', id);
    }
    setSessionId(id);
  }, []);

  // Load branding config
  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((data) => setBrand({ label: data.label, iconDataUrl: data.iconDataUrl }))
      .catch(() => {}); // keep default on error
  }, []);

  const handleSend = async (message: string) => {
    if (!sessionId) return;

    setMessages((prev) => [...prev, { role: 'user', content: message }]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, sessionId }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer, sources: data.sources },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.error ?? 'Something went wrong. Please try again.' },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Network error. Please check your connection and try again.' },
      ]);
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

      <ChatWindow messages={messages} isLoading={isLoading} />

      <div className="flex justify-center py-2 border-t border-gray-100">
        <a href="https://www.framelink.co" target="_blank" rel="noopener noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://www.dropbox.com/scl/fi/422fj8txovd9bb9031hl2/FLSite.png?rlkey=e7iyb8pca6931kq7a19gx6514&raw=1"
            alt="©2026 FrameLink"
            style={{ width: 90, verticalAlign: 'middle' }}
          />
        </a>
      </div>

      <ChatInput onSend={handleSend} disabled={isLoading || !sessionId} />
    </div>
  );
}
