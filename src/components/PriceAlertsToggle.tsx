'use client';

import React, { useEffect, useState } from 'react';
import { BellRing } from 'lucide-react';
import { useApp } from '@/context/AppContext';

// "Email me when a saved piece gets cheaper" — the signed-in user's
// price-alert setting (daily check: src/lib/priceAlerts.ts).
export default function PriceAlertsToggle() {
  const { t } = useApp();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/user/price-alerts')
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.success) setEnabled(Boolean(d.enabled));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (enabled === null) return null;

  const toggle = async () => {
    const next = !enabled;
    setSaving(true);
    setEnabled(next);
    try {
      const res = await fetch('/api/user/price-alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      if (!res.ok) setEnabled(!next);
    } catch {
      setEnabled(!next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <label className="flex items-center gap-2.5 text-xs text-[#554740] cursor-pointer select-none">
      <input
        type="checkbox"
        checked={enabled}
        onChange={toggle}
        disabled={saving}
        className="w-4 h-4 accent-[#BA4E25]"
      />
      <BellRing className="w-3.5 h-3.5 text-[#BA4E25]" />
      <span>{t.account.priceAlerts}</span>
    </label>
  );
}
