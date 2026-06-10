
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ChatMessage } from '../types';

interface ChatState {
  // Key format: `${projectId}-${agentId}` or just `standalone-${agentId}`
  chats: Record<string, ChatMessage[]>;
  addMessage: (chatId: string, message: ChatMessage) => void;
  clearChat: (chatId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: {},
      addMessage: (chatId, message) =>
        set((state) => ({
          chats: {
            ...state.chats,
            [chatId]: [...(state.chats[chatId] || []), message],
          },
        })),
      clearChat: (chatId) =>
        set((state) => {
          const newChats = { ...state.chats };
          delete newChats[chatId];
          return { chats: newChats };
        }),
    }),
    { name: 'pm-command-center-chats' }
  )
);
