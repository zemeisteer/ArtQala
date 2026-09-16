'use client';

import React, { useState } from 'react';
import { Percent, Plus, Trash2, ArrowRight, ShieldCheck } from 'lucide-react';
import FilterSelect from '@/components/FilterSelect';
import DatePicker from '@/components/DatePicker';

interface AdminDiscountsClientProps {
  initialDiscounts: any[];
  paintings: any[];
  artists: any[];
  categories: any[];
}

export default function AdminDiscountsClient({
  initialDiscounts,
  paintings,
  artists,
  categories,
}: AdminDiscountsClientProps) {
  const [discounts, setDiscounts] = useState(initialDiscounts);
  const [scope, setScope] = useState<'PAINTING' | 'ARTIST' | 'CATEGORY' | 'SITE'>('PAINTING');
  const [targetId, setTargetId] = useState('');
  const [percent, setPercent] = useState('15');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddDiscount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope,
          target_id: scope === 'SITE' ? null : targetId,
          percent: parseFloat(percent),
          starts_at: startsAt || null,
          ends_at: endsAt || null,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setDiscounts([data.discount, ...discounts]);
        setPercent('15');
        alert('Discount rule created successfully!');
      }
    } catch (e) {
      alert('Error creating discount');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this discount rule?')) return;
    try {
      const res = await fetch(`/api/admin/discounts?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDiscounts(discounts.filter((d) => d.id !== id));
      }
    } catch (e) {
      alert('Failed to remove discount');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
            Discount &amp; Promotion Engine
          </h2>
          <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
            {discounts.length}
          </span>
        </div>
        <p className="text-xs text-[#726861] mt-0.5">
          Manage 4-tier discount rules with automatic priority resolution
        </p>
      </div>

      {/* Priority Hierarchy Visualizer matching TZ Section 3 */}
      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-5">
        <h3 className="text-xs font-bold tracking-wider text-[#BA4E25] uppercase mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" />
          <span>Priority Hierarchy Rule (Most Specific Wins)</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="bg-[#BA4E25] text-white px-3 py-1.5 rounded-[3px] shadow-xs">
            1. Painting Override (Highest)
          </span>
          <ArrowRight className="w-4 h-4 text-[#8F8178]" />
          <span className="bg-[#429599] text-white px-3 py-1.5 rounded-[3px] shadow-xs">
            2. Artist Collection
          </span>
          <ArrowRight className="w-4 h-4 text-[#8F8178]" />
          <span className="bg-[#DAA932] text-[#281C18] px-3 py-1.5 rounded-[3px] shadow-xs">
            3. Category
          </span>
          <ArrowRight className="w-4 h-4 text-[#8F8178]" />
          <span className="bg-[#281C18] text-white px-3 py-1.5 rounded-[3px] shadow-xs">
            4. Site-Wide (Lowest)
          </span>
        </div>
      </div>

      {/* 2-Column: Create Form and Active Rules Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Create Form */}
        <div className="lg:col-span-5 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
          <h3 className="font-serif text-xl font-semibold text-[#281C18]">
            Create Discount Rule
          </h3>

          <form onSubmit={handleAddDiscount} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                DISCOUNT LEVEL / SCOPE *
              </label>
              <FilterSelect
                value={scope}
                onChange={(v) => setScope(v as any)}
                buttonClassName="!rounded-[3px] !py-2.5"
                options={[
                  { value: 'PAINTING', label: '1. Specific Painting (Individual)' },
                  { value: 'ARTIST', label: '2. Entire Artist Catalog' },
                  { value: 'CATEGORY', label: '3. Entire Category' },
                  { value: 'SITE', label: '4. Site-Wide General Promotion' },
                ]}
              />
            </div>

            {scope === 'PAINTING' && (
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  SELECT PAINTING
                </label>
                <FilterSelect
                  value={targetId}
                  onChange={setTargetId}
                  allValue=""
                  allLabel="-- Choose painting --"
                  searchable
                  buttonClassName="!rounded-[3px] !py-2"
                  options={paintings.map((p) => ({ value: p.id, label: p.title_en }))}
                />
              </div>
            )}

            {scope === 'ARTIST' && (
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  SELECT ARTIST
                </label>
                <FilterSelect
                  value={targetId}
                  onChange={setTargetId}
                  allValue=""
                  allLabel="-- Choose artist --"
                  searchable
                  buttonClassName="!rounded-[3px] !py-2"
                  options={artists.map((a) => ({ value: a.id, label: a.name }))}
                />
              </div>
            )}

            {scope === 'CATEGORY' && (
              <div>
                <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  SELECT CATEGORY
                </label>
                <FilterSelect
                  value={targetId}
                  onChange={setTargetId}
                  allValue=""
                  allLabel="-- Choose category --"
                  buttonClassName="!rounded-[3px] !py-2"
                  options={categories.map((c) => ({ value: c.id, label: c.name_en }))}
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                DISCOUNT PERCENT (%) *
              </label>
              <input
                type="number"
                min={1}
                max={90}
                required
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                placeholder="15"
                className="w-full text-xs px-3.5 py-2 bg-white border border-[#E7E0D8] rounded-[3px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  STARTS AT
                </label>
                <DatePicker
                  value={startsAt}
                  onChange={setStartsAt}
                  buttonClassName="!text-[11px] !py-1.5"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-bold tracking-wider text-[#6B5E55] uppercase mb-1">
                  ENDS AT
                </label>
                <DatePicker
                  value={endsAt}
                  onChange={setEndsAt}
                  buttonClassName="!text-[11px] !py-1.5"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#BA4E25] hover:bg-[#9C3E1B] text-white font-semibold text-xs py-3 rounded-[3px] transition-all flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>{loading ? 'Creating...' : 'Activate Discount Rule'}</span>
            </button>
          </form>
        </div>

        {/* Active Rules List */}
        <div className="lg:col-span-7 bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] p-6 space-y-4 shadow-xs">
          <h3 className="font-serif text-xl font-semibold text-[#281C18]">
            Active Rules ({discounts.length})
          </h3>

          <div className="space-y-3">
            {discounts.map((d) => (
              <div
                key={d.id}
                className="p-4 bg-[#FAF4EC]/60 border border-[#E7E0D8] rounded-[3px] flex items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="bg-[#BA4E25] text-white text-[11px] font-bold px-2 py-0.5 rounded-[2px]">
                      -{d.percent}%
                    </span>
                    <span className="font-semibold text-xs text-[#281C18]">
                      Scope: {d.scope}
                    </span>
                  </div>
                  <div className="text-[11px] text-[#726861] mt-1">
                    {d.starts_at && d.ends_at
                      ? `Valid: ${new Date(d.starts_at).toLocaleDateString()} to ${new Date(
                          d.ends_at
                        ).toLocaleDateString()}`
                      : 'Always active'}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(d.id)}
                  className="p-1.5 text-[#8F8178] hover:text-[#C62828] transition-colors rounded hover:bg-white"
                  title="Remove rule"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
