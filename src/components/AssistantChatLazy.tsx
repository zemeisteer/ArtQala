'use client';

import dynamic from 'next/dynamic';

// The AI assistant bubble is on every page but rarely opened first thing —
// its code loads after the page instead of with it.
const AssistantChat = dynamic(() => import('./AssistantChat'), { ssr: false });

export default function AssistantChatLazy() {
  return <AssistantChat />;
}
