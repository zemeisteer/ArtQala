import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminWorkshopsClient from './AdminWorkshopsClient';

export const dynamic = 'force-dynamic';

export default async function AdminWorkshopsPage() {
  const workshops = await prisma.workshop.findMany({ orderBy: [{ sort: 'asc' }, { created_at: 'asc' }] });
  return <AdminWorkshopsClient initial={JSON.parse(JSON.stringify(workshops))} />;
}
