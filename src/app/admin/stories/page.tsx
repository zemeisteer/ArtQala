import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminStoriesClient from './AdminStoriesClient';

export const dynamic = 'force-dynamic';

export default async function AdminStoriesPage() {
  const stories = await prisma.story.findMany({ orderBy: [{ created_at: 'desc' }] });
  return <AdminStoriesClient initial={JSON.parse(JSON.stringify(stories))} />;
}
