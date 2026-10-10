import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminStaffClient from './AdminStaffClient';
import AdminSessionsPanel from './AdminSessionsPanel';

export const dynamic = 'force-dynamic';

export default async function AdminStaffPage() {
  const staff = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      name: true,
      email: true,
      must_change_password: true,
      created_at: true,
    },
    orderBy: { created_at: 'asc' },
  });

  return (
    <div className="space-y-10">
      <AdminStaffClient initialStaff={staff} />
      <AdminSessionsPanel />
    </div>
  );
}
