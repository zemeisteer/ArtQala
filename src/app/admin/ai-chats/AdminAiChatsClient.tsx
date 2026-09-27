'use client';

import React, { useMemo, useState } from 'react';
import { Sparkles, Trash2, User, Search } from 'lucide-react';

interface AiMessage {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

interface AiConversation {
  id: string;
  lang: string;
  first_page: string | null;
  country: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
  messages: AiMessage[];
}

const countryName = (code: string | null) => {
  if (!code) return '';
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code;
  } catch {
    return code;
  }
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

// Read-only view of website AI assistant conversations: what visitors ask
// (to learn what buyers want) and what the assistant answered (to spot a
// wrong answer). Visitors are anonymous — only language, country and the
// page they started on are kept.
export default function AdminAiChatsClient({ initialConversations }: { initialConversations: AiConversation[] }) {
  const [conversations, setConversations] = useState(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id || null);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => c.messages.some((m) => m.content.toLowerCase().includes(q)));
  }, [conversations, query]);

  const selected = conversations.find((c) => c.id === selectedId) || null;

  const remove = async (id: string) => {
    if (!confirm("Bu suhbatni o'chirasizmi?")) return;
    const res = await fetch(`/api/admin/ai-chats/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!data.success) {
      alert("O'chirishda xatolik yuz berdi");
      return;
    }
    const rest = conversations.filter((c) => c.id !== id);
    setConversations(rest);
    setSelectedId(rest[0]?.id || null);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">AI chats</h2>
          <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
            {conversations.length}
          </span>
        </div>
        <p className="text-xs text-[#726861] mt-0.5">
          Saytdagi AI yordamchiga tashrif buyuruvchilar nima deb yozgani va u nima javob bergani
        </p>
      </div>

      {conversations.length === 0 ? (
        <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] py-16 text-center text-sm text-[#726861]">
          <Sparkles className="w-8 h-8 mx-auto text-[#D2C5BA] mb-2" />
          {"Hali suhbatlar yo'q"}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-4 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] overflow-hidden flex flex-col max-h-[75vh]">
            <div className="p-3 border-b border-[#E7E0D8] relative">
              <Search className="w-4 h-4 text-[#8F8178] absolute left-6 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Suhbatlardan qidirish..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-[#E7E0D8] rounded-[3px] text-xs focus:outline-none focus:border-[#BA4E25]"
              />
            </div>
            <div className="overflow-y-auto divide-y divide-[#F0EAE1]">
              {filtered.map((c) => {
                const firstQuestion = c.messages.find((m) => m.role === 'USER')?.content || '';
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full text-left px-4 py-3 transition-colors cursor-pointer ${
                      c.id === selectedId ? 'bg-[#FAF4EC]' : 'hover:bg-[#FAF4EC]/50'
                    }`}
                  >
                    <p className="text-xs font-semibold text-[#281C18] line-clamp-2">{firstQuestion}</p>
                    <p className="text-[10.5px] text-[#8F7E73] mt-1">
                      {formatDate(c.updated_at)} · {c.lang.toUpperCase()}
                      {c.country ? ` · ${countryName(c.country)}` : ''} · {Math.ceil(c.message_count / 2)} savol
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] flex flex-col max-h-[75vh]">
            {selected && (
              <>
                <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-[#E7E0D8]">
                  <div className="text-xs text-[#726861] space-y-0.5">
                    <p>
                      <strong className="text-[#281C18]">{formatDate(selected.created_at)}</strong> · til:{' '}
                      {selected.lang.toUpperCase()}
                      {selected.country ? ` · ${countryName(selected.country)}` : ''}
                    </p>
                    {selected.first_page && <p>Boshlangan sahifa: {selected.first_page}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(selected.id)}
                    title="O'chirish"
                    aria-label="O'chirish"
                    className="p-2 rounded-[3px] border border-[#E7E0D8] text-[#8F7E73] hover:text-[#C62828] hover:border-[#C62828]/40 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-[13px] leading-relaxed">
                  {selected.messages.map((m) => (
                    <div key={m.id} className={`flex gap-2 ${m.role === 'USER' ? '' : 'flex-row-reverse'}`}>
                      <div
                        className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${
                          m.role === 'USER' ? 'bg-[#E7E0D8] text-[#554740]' : 'bg-[#281C18] text-[#DAA932]'
                        }`}
                      >
                        {m.role === 'USER' ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 max-w-[80%] whitespace-pre-wrap ${
                          m.role === 'USER' ? 'bg-white border border-[#E7E0D8] text-[#281C18]' : 'bg-[#FAF4EC] text-[#3E332E]'
                        }`}
                      >
                        {m.content}
                        <p className="text-[10px] text-[#A8988E] mt-1">{formatDate(m.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
