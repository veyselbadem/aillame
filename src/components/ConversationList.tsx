'use client';

import { useMemory } from '@hooks/useMemory';

interface ConversationListProps {
  onSelect: (id: string) => void;
  selectedId?: string;
}

export default function ConversationList({ onSelect, selectedId }: ConversationListProps) {
  const { conversations } = useMemory();

  return (
    <aside className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
      <div className="font-bold mb-4">Konuşmalar</div>
      <ul className="space-y-2">
        {conversations.map((conv) => (
          <li key={conv.id}>
            <button
              className={`w-full text-left px-3 py-2 rounded transition-colors ${
                selectedId === conv.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-200'
              }`}
              onClick={() => onSelect(conv.id)}
            >
              {conv.firstMessage?.content?.slice(0, 32) || 'Yeni Konuşma'}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
