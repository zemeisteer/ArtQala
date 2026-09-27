'use client';

import React, { useEffect, useRef, useState } from 'react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Sparkles, X, Send, Loader2 } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { trackEvent } from '@/lib/analytics';

// AI assistant chat bubble (above the WhatsApp button). Talks to
// /api/assistant; the conversation id and messages are kept in this
// browser so reopening the panel — or moving between pages — continues it.

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
}

const STORAGE_KEY = 'artqala_assistant';

// Tiny renderer for the assistant's replies: markdown links (internal ones
// become client-side links), **bold**, and "- " bullet lines.
function renderInline(text: string, key: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) {
      const href = m[2];
      out.push(
        href.startsWith('/') ? (
          <NextLink key={`${key}-${i++}`} href={href} className="underline text-[#BA4E25] hover:text-[#9C3E1B]">
            {m[1]}
          </NextLink>
        ) : (
          <a key={`${key}-${i++}`} href={href} target="_blank" rel="noopener noreferrer" className="underline text-[#BA4E25]">
            {m[1]}
          </a>
        )
      );
    } else if (m[3]) {
      out.push(<strong key={`${key}-${i++}`}>{m[3]}</strong>);
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function RichText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <>
      {lines.map((line, idx) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const content = renderInline(line.replace(/^\s*[-*•]\s+/, ''), `l${idx}`);
        if (!line.trim()) return <div key={idx} className="h-2" />;
        return bullet ? (
          <div key={idx} className="flex gap-1.5 pl-1">
            <span>•</span>
            <span>{content}</span>
          </div>
        ) : (
          <p key={idx}>{content}</p>
        );
      })}
    </>
  );
}

export default function AssistantChat() {
  const { t, lang } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Restore the conversation from this browser.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (saved && Array.isArray(saved.messages)) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMessages(saved.messages.slice(-40));
        setConversationId(saved.conversationId || null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversationId, messages: messages.slice(-40) }));
    } catch {}
  }, [messages, conversationId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, sending, open]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || sending) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setSending(true);
    trackEvent('assistant_message', { page_path: pathname });
    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId, lang, page: pathname }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.conversationId) setConversationId(data.conversationId);
      const reply = data.success
        ? data.reply
        : data.error === 'rate_limited' || data.error === 'conversation_full'
        ? t.assistant.limitReached
        : t.assistant.unavailable;
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: t.assistant.unavailable }]);
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setMessages([]);
    setConversationId(null);
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            trackEvent('assistant_open', { page_path: pathname });
          }}
          aria-label={t.assistant.open}
          title={t.assistant.open}
          className="fixed bottom-[88px] right-5 sm:bottom-[96px] sm:right-6 z-[140] w-14 h-14 rounded-full bg-[#281C18] hover:bg-[#BA4E25] text-[#FAF4EC] shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 cursor-pointer"
        >
          <Sparkles className="w-6 h-6" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label={t.assistant.title}
          className="fixed z-[160] bottom-4 right-4 left-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[380px] h-[min(560px,calc(100vh-2rem))] bg-[#FDFBF9] border border-[#E7E0D8] rounded-xl shadow-2xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center justify-between gap-3 px-4 py-3 bg-[#281C18] text-[#FAF4EC]">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-4 h-4 text-[#DAA932] shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{t.assistant.title}</p>
                <p className="text-[10.5px] text-[#C5B7AD] truncate">{t.assistant.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {messages.length > 0 && (
                <button type="button" onClick={reset} className="text-[10.5px] text-[#C5B7AD] hover:text-white px-2 py-1 cursor-pointer">
                  {t.assistant.newChat}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label={t.assistant.close} className="p-1 hover:text-[#DAA932] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 text-[13px] leading-relaxed">
            <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-lg rounded-tl-sm px-3 py-2 text-[#3E332E] max-w-[88%]">
              {t.assistant.greeting}
            </div>
            {messages.length === 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {t.assistant.suggestions.map((s: string) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="text-[11.5px] px-2.5 py-1.5 rounded-full border border-[#E7E0D8] bg-white text-[#554740] hover:border-[#BA4E25] hover:text-[#BA4E25] cursor-pointer"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, idx) =>
              m.role === 'user' ? (
                <div key={idx} className="ml-auto bg-[#BA4E25] text-white rounded-lg rounded-tr-sm px-3 py-2 max-w-[85%] w-fit whitespace-pre-wrap">
                  {m.text}
                </div>
              ) : (
                <div key={idx} className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-lg rounded-tl-sm px-3 py-2 text-[#3E332E] max-w-[88%] space-y-1">
                  <RichText text={m.text} />
                </div>
              )
            )}
            {sending && (
              <div className="flex items-center gap-2 text-[#8F7E73] text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {t.assistant.thinking}
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="border-t border-[#E7E0D8] p-3 space-y-1.5"
          >
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value.slice(0, 800))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder={t.assistant.placeholder}
                aria-label={t.assistant.placeholder}
                className="flex-1 resize-none max-h-28 text-sm px-3 py-2 bg-white border border-[#E7E0D8] rounded-lg focus:outline-none focus:border-[#BA4E25]"
              />
              <button
                type="submit"
                disabled={!input.trim() || sending}
                aria-label={t.assistant.send}
                className="w-10 h-10 shrink-0 rounded-lg bg-[#BA4E25] hover:bg-[#9C3E1B] text-white flex items-center justify-center disabled:opacity-40 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-[#8F7E73] leading-snug">{t.assistant.disclaimer}</p>
          </form>
        </div>
      )}
    </>
  );
}
