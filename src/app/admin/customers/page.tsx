import React from 'react';
import { prisma } from '@/lib/prisma';
import { Users2, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminCustomersPage() {
  const customers = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      email_verified: true,
      role: true,
      _count: { select: { inquiries: true, wishlist_items: true } },
    },
    orderBy: { created_at: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2.5">
          <h2 className="font-serif text-3xl font-semibold text-[#281C18]">
            Registered Customers
          </h2>
          <span className="text-[11px] font-semibold text-[#8F7E73] bg-white border border-[#E7E0D8] px-2 py-0.5 rounded-full">
            {customers.length}
          </span>
        </div>
        <p className="text-xs text-[#726861] mt-0.5">
          Tourist and collector accounts, verified emails, and inquiry activity
        </p>
      </div>

      <div className="bg-[#FDFBF9] border border-[#E7E0D8] rounded-[4px] shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-[#FAF4EC] border-b border-[#E7E0D8] text-[#8F8178] font-bold tracking-wider uppercase text-[10.5px]">
              <th className="py-3 px-4">NAME</th>
              <th className="py-3 px-4">EMAIL</th>
              <th className="py-3 px-4">COUNTRY</th>
              <th className="py-3 px-4">STATUS</th>
              <th className="py-3 px-4">ROLE</th>
              <th className="py-3 px-4 text-right">INQUIRIES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EAE1]">
            {customers.map((u) => (
              <tr key={u.id} className="hover:bg-[#FAF4EC]/40 transition-colors">
                <td className="py-3.5 px-4 font-semibold text-[#281C18]">
                  {u.name}
                </td>
                <td className="py-3.5 px-4 text-[#554740]">{u.email}</td>
                <td className="py-3.5 px-4 text-[#726861]">{u.country || 'Uzbekistan'}</td>
                <td className="py-3.5 px-4">
                  {u.email_verified ? (
                    <span className="bg-[#DCFCE7] text-[#16A34A] text-[10.5px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Verified</span>
                    </span>
                  ) : (
                    <span className="bg-[#FEF3C7] text-[#D97706] text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                      Unverified
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 font-bold text-xs text-[#BA4E25]">{u.role}</td>
                <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#281C18]">
                  {u._count.inquiries}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
