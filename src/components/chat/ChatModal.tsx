'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Send, Shield, User, Loader2, Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export interface ThreadMessage {
  id: string;
  sender: 'CUSTOMER' | 'ADMIN';
  message: string;
  created_at: string | Date;
  is_read?: boolean;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  status: string;
  statusBadge: React.ReactNode;
  messages: ThreadMessage[];
  onSendMessage: (text: string) => Promise<boolean>;
  imageSrc?: string;
  priceText?: string;
}

export default function ChatModal({
  isOpen,
  onClose,
  title,
  subtitle,
  status,
  statusBadge,
  messages,
  onSendMessage,
  imageSrc,
  priceText,
}: ChatModalProps) {
  const { t } = useApp();
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Scrolls only the message thread itself, never the page behind the modal.
  useEffect(() => {
    if (isOpen) {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [isOpen, messages]);

  if (!isOpen) return null;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || sending) return;

    setSending(true);
    const success = await onSendMessage(inputText.trim());
    setSending(false);
    if (success) {
      setInputText('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
      <div className="bg-[#FAF4EC] border border-[#E7E0D8] rounded-[4px] shadow-2xl w-full max-w-2xl h-[90vh] max-h-[700px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-[#281C18] text-[#FAF4EC] p-4 sm:p-5 flex items-center justify-between gap-4 border-b border-[#3B2C27] shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            {imageSrc && (
              <div className="w-12 h-12 rounded-[2px] overflow-hidden relative border border-[#4A3B35] shrink-0 bg-[#35251F]">
                <Image src={imageSrc} alt={title} fill sizes="48px" className="object-cover" />
              </div>
            )}
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-lg font-semibold text-[#FAF4EC] truncate">
                  {title}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#C5B7AD] mt-0.5">
                {subtitle && <span className="truncate">{subtitle}</span>}
                {priceText && <span className="font-mono text-[#DAA932]">· {priceText}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {statusBadge}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#C5B7AD] hover:text-white hover:bg-[#3B2C27] transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Thread History */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAF4EC]">
          {messages.length === 0 ? (
            <div className="text-center py-16 text-xs text-[#756962]">
              {t.chat.noMessages}
            </div>
          ) : (
            messages.map((msg) => {
              const isCustomer = msg.sender === 'CUSTOMER';
              const timeStr = new Date(msg.created_at).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const dateStr = new Date(msg.created_at).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`flex items-center gap-1.5 text-[10.5px] mb-1 font-medium ${
                      isCustomer ? 'text-[#756962] flex-row-reverse' : 'text-[#726861]'
                    }`}
                  >
                    {isCustomer ? (
                      <>
                        <User className="w-3 h-3 text-[#BA4E25]" />
                        <span>{t.chat.you}</span>
                      </>
                    ) : (
                      <>
                        <Shield className="w-3 h-3 text-[#DAA932]" />
                        <span className="text-[#DAA932] font-semibold">{t.chat.curator}</span>
                      </>
                    )}
                    <span className="text-[#B5A599]">· {dateStr}, {timeStr}</span>
                  </div>

                  <div
                    className={`max-w-[85%] sm:max-w-[75%] rounded-[4px] px-4 py-3 text-xs leading-relaxed shadow-xs ${
                      isCustomer
                        ? 'bg-[#BA4E25] text-white rounded-tr-none'
                        : 'bg-[#281C18] text-[#FAF4EC] rounded-tl-none border border-[#3B2C27]'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={handleSend}
          className="p-3 sm:p-4 bg-[#FDFBF9] border-t border-[#E7E0D8] flex items-center gap-3 shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t.chat.typeMessage}
            disabled={sending}
            className="flex-1 bg-white border border-[#D4C9BC] rounded-[3px] px-3.5 py-2.5 text-xs text-[#281C18] focus:outline-hidden focus:border-[#BA4E25] transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="bg-[#BA4E25] hover:bg-[#9C3E1B] disabled:opacity-50 text-white text-xs font-semibold px-4 py-2.5 rounded-[3px] transition flex items-center gap-1.5 shrink-0"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t.chat.sendMessage}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
