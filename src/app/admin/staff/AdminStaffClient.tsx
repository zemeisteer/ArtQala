'use client';

import React, { useState } from 'react';
import { Plus, Trash2, X, ShieldCheck, Clock } from 'lucide-react';
import { useApp } from '@/context/AppContext';

interface StaffItem {
  id: string;
  name: string;
  email: string;
  must_change_password: boolean;
  created_at: string | Date;
}

export default function AdminStaffClient({ initialStaff }: { initialStaff: StaffItem[] }) {
  const { user } = useApp();
  const [staff, setStaff] = useState<StaffItem[]>(initialStaff);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const openCreateModal = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (data.success && data.staff) {
        setStaff((prev) => [...prev, data.staff]);
        setIsModalOpen(false);
      } else {
        setError(data.error || "Xodim qo'shishda xatolik yuz berdi");
      }
    } catch {
      setError('Serverga bog\'lanishda xatolik');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, staffName: string) => {
    if (!confirm(`"${staffName}" ni admin ro'yxatidan o'chirishni tasdiqlaysizmi?`)) return;

    try {
      const res = await fetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setStaff((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert(data.error || "O'chirishda xatolik yuz berdi.");
      }
    } catch {
      alert('Serverga bog\'lanishda xatolik.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
              Xodimlar (Admin huquqi)
            </h2>
            <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
              {staff.length}
            </span>
          </div>
          <p className="text-xs text-[#726861] mt-0.5">
            Admin panelga kirish huquqiga ega hisoblar ro'yxati
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-[#BA4E25] hover:bg-[#9C3E1B] text-white text-xs font-semibold rounded-[3px] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Xodim Qo'shish</span>
        </button>
      </div>

      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#FAF4EC] border-b border-[#E7E0D8] text-[#8F8178] font-bold tracking-wider uppercase text-[10.5px]">
              <th className="py-3 px-4">ISM</th>
              <th className="py-3 px-4">EMAIL</th>
              <th className="py-3 px-4">HOLAT</th>
              <th className="py-3 px-4">QO'SHILGAN SANA</th>
              <th className="py-3 px-4 text-right">AMALLAR</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EAE1]">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-[#FAF4EC]/40 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-[#281C18] flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#BA4E25] shrink-0" />
                  <span>{s.name}</span>
                  {s.id === user?.id && (
                    <span className="text-[10px] font-bold text-[#429599] bg-[#429599]/10 px-1.5 py-0.5 rounded-full">
                      Siz
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-[#554740]">{s.email}</td>
                <td className="py-3.5 px-4">
                  {s.must_change_password ? (
                    <span className="bg-[#FEF3C7] text-[#D97706] text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>Parol kutilmoqda</span>
                    </span>
                  ) : (
                    <span className="bg-[#DCFCE7] text-[#16A34A] text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                      Faol
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-[#726861]">
                  {new Date(s.created_at).toLocaleDateString()}
                </td>
                <td className="py-3.5 px-4 text-right">
                  {s.id !== user?.id && (
                    <button
                      onClick={() => handleDelete(s.id, s.name)}
                      className="p-1.5 text-[#8F7E73] hover:text-red-600 hover:bg-white rounded transition-colors cursor-pointer"
                      title="O'chirish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#E7E0D8]">
            <div className="flex items-center justify-between border-b pb-3 border-[#E7E0D8]">
              <h3 className="font-serif text-lg font-bold text-[#281C18]">Yangi Xodim Qo'shish</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[#8F7E73] hover:text-[#281C18]">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] text-xs rounded-[2px]">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">Ism va Familiya *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="masalan: Malika Yusupova"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="malika@artqala.com"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#6B5E55] mb-1">Vaqtinchalik Parol *</label>
                <input
                  type="text"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Kamida 8 belgi, 1 katta harf, 1 raqam"
                  className="w-full text-xs px-3 py-2 border border-[#E7E0D8] rounded focus:outline-none focus:border-[#BA4E25]"
                />
                <p className="text-[10.5px] text-[#8F7E73] mt-1">
                  Xodim birinchi marta kirganda ushbu parolni o'zgartirishga majburlanadi.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E7E0D8] text-xs font-semibold text-[#554740] rounded hover:bg-gray-50"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#BA4E25] text-white text-xs font-semibold rounded hover:bg-[#9C3E1B] disabled:opacity-50 cursor-pointer"
                >
                  {loading ? 'Saqlanmoqda...' : "Qo'shish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
