'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Monitor, Smartphone, LogOut, Loader2, RefreshCw, ShieldAlert } from 'lucide-react';

interface SessionItem {
  id: string;
  name: string;
  email: string;
  ip: string | null;
  country: string | null;
  city: string | null;
  browser: string;
  os: string;
  mobile: boolean;
  created_at: string;
  last_seen_at: string;
  ended_at: string | null;
  status: 'ACTIVE' | 'LOGOUT' | 'REVOKED' | 'EXPIRED';
  current: boolean;
}

const STATUS: Record<SessionItem['status'], { label: string; className: string }> = {
  ACTIVE: { label: 'Faol', className: 'bg-[#E8F5E9] text-[#1B5E20] border-[#A5D6A7]' },
  LOGOUT: { label: "O'zi chiqqan", className: 'bg-white text-[#726861] border-[#E7E0D8]' },
  REVOKED: { label: 'Chiqarib yuborilgan', className: 'bg-red-50 text-red-700 border-red-200' },
  EXPIRED: { label: 'Muddati tugagan', className: 'bg-white text-[#726861] border-[#E7E0D8]' },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const place = (s: SessionItem) => {
  let country = s.country || '';
  try {
    if (s.country) country = new Intl.DisplayNames(['en'], { type: 'region' }).of(s.country) || s.country;
  } catch {}
  return [s.city, country].filter(Boolean).join(', ') || "Noma'lum joy";
};

// Who is (or was) signed in to the admin panel — account, device, place,
// time — with a button to sign any of them out. A signed-out session stops
// working on its next request. Backed by /api/admin/sessions.
export default function AdminSessionsPanel() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/sessions', { cache: 'no-store' });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setSessions(data.sessions);
    } catch {
      setError("Kirishlar ro'yxatini yuklab bo'lmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const revoke = async (s: SessionItem) => {
    const message = s.current
      ? "Bu — sizning hozirgi kirishingiz. Chiqarib yuborsangiz, o'zingiz ham tizimdan chiqasiz. Davom etasizmi?"
      : `${s.name} (${s.browser || 'brauzer'} · ${s.os || 'qurilma'}) admin paneldan chiqarib yuborilsinmi?`;
    if (!confirm(message)) return;
    setBusyId(s.id);
    try {
      const res = await fetch(`/api/admin/sessions/${s.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error();
      if (data.self) {
        // Full reload on purpose: drops every bit of signed-in state.
        window.location.assign('/admin/login');
        return;
      }
      await load();
    } catch {
      alert('Chiqarib yuborishda xatolik yuz berdi');
    } finally {
      setBusyId(null);
    }
  };

  const revokeOthers = async () => {
    if (!confirm("O'zingizdan boshqa barcha faol kirishlar chiqarib yuborilsinmi?")) return;
    setBusyId('others');
    try {
      const res = await fetch('/api/admin/sessions', { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) throw new Error();
      await load();
    } catch {
      alert('Chiqarib yuborishda xatolik yuz berdi');
    } finally {
      setBusyId(null);
    }
  };

  const othersActive = sessions.some((s) => s.status === 'ACTIVE' && !s.current);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-2xl font-semibold text-[#281C18]">Admin panelga kirishlar</h2>
          <p className="text-xs text-[#726861] mt-0.5">
            Kim, qaysi qurilmadan, qayerdan va qachon kirgani. Keraksiz kirishni chiqarib yuborishingiz mumkin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="px-3 py-2 border border-[#E7E0D8] bg-white text-xs font-semibold text-[#554740] rounded-[3px] hover:bg-[#FAF4EC] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Yangilash
          </button>
          {othersActive && (
            <button
              type="button"
              onClick={revokeOthers}
              disabled={busyId !== null}
              className="px-3 py-2 border border-red-200 bg-red-50 text-xs font-semibold text-red-700 rounded-[3px] hover:bg-red-100 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Boshqa hammasini chiqarish
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}

      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] overflow-x-auto">
        {loading && sessions.length === 0 ? (
          <div className="py-10 flex items-center justify-center text-xs text-[#8F7E73]">
            <Loader2 className="w-4 h-4 animate-spin mr-2 text-[#BA4E25]" />
            Yuklanmoqda...
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-10 text-center text-xs text-[#8F7E73]">{"Hali kirishlar yo'q"}</p>
        ) : (
          <table className="w-full text-xs min-w-[720px]">
            <thead>
              <tr className="text-left text-[10.5px] uppercase tracking-wider text-[#8F7E73] border-b border-[#E7E0D8]">
                <th className="py-3 px-4 font-bold">Akkaunt</th>
                <th className="py-3 px-4 font-bold">Qurilma</th>
                <th className="py-3 px-4 font-bold">Joy / IP</th>
                <th className="py-3 px-4 font-bold">Kirgan</th>
                <th className="py-3 px-4 font-bold">Oxirgi faollik</th>
                <th className="py-3 px-4 font-bold">Holat</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EAE1]">
              {sessions.map((s) => (
                <tr key={s.id} className={s.current ? 'bg-[#FAF4EC]/70' : ''}>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-[#281C18] flex items-center gap-1.5">
                      {s.name}
                      {s.current && (
                        <span className="text-[9.5px] font-bold uppercase tracking-wide text-[#429599] bg-[#429599]/10 px-1.5 py-0.5 rounded">
                          Siz
                        </span>
                      )}
                    </div>
                    <div className="text-[10.5px] text-[#8F7E73]">{s.email}</div>
                  </td>
                  <td className="py-3 px-4 text-[#554740]">
                    <span className="flex items-center gap-1.5">
                      {s.mobile ? (
                        <Smartphone className="w-3.5 h-3.5 text-[#8F7E73] shrink-0" />
                      ) : (
                        <Monitor className="w-3.5 h-3.5 text-[#8F7E73] shrink-0" />
                      )}
                      {[s.browser, s.os].filter(Boolean).join(' · ') || "Noma'lum"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#554740]">
                    <div>{place(s)}</div>
                    <div className="text-[10.5px] font-mono text-[#8F7E73]">{s.ip || '—'}</div>
                  </td>
                  <td className="py-3 px-4 text-[#554740] whitespace-nowrap">{formatDate(s.created_at)}</td>
                  <td className="py-3 px-4 text-[#554740] whitespace-nowrap">
                    {formatDate(s.ended_at || s.last_seen_at)}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${STATUS[s.status].className}`}
                    >
                      {STATUS[s.status].label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {s.status === 'ACTIVE' && (
                      <button
                        type="button"
                        onClick={() => revoke(s)}
                        disabled={busyId !== null}
                        className="px-2.5 py-1.5 border border-red-200 bg-red-50 text-[11px] font-semibold text-red-700 rounded-[3px] hover:bg-red-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                      >
                        {busyId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <LogOut className="w-3 h-3" />}
                        Chiqarib yuborish
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-[10.5px] text-[#A8988E]">
        Oxirgi 100 ta kirish ko&apos;rsatiladi. Admin kirishi 12 soatdan keyin o&apos;zi tugaydi.
      </p>
    </div>
  );
}
