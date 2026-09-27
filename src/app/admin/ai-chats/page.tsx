import React from 'react';
import { prisma } from '@/lib/prisma';
import AdminAiChatsClient from './AdminAiChatsClient';

export const dynamic = 'force-dynamic';

// What visitors asked the website AI assistant (newest first).
export default async function AdminAiChatsPage() {
  const conversations = await prisma.aiConversation.findMany({
    where: { message_count: { gt: 0 } },
    orderBy: { updated_at: 'desc' },
    take: 200,
    include: { messages: { orderBy: { created_at: 'asc' } } },
  });

  return <AdminAiChatsClient initialConversations={JSON.parse(JSON.stringify(conversations))} />;
}
