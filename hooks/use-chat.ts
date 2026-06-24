/**
 * useChat Hook
 * Manages chat state and logic
 */

import {
    clearChatHistory as clearChatHistoryApi,
    getChatHistory,
    sendChatMessage,
} from '@/services/aiChatService';
import { useCallback, useEffect, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const history = await getChatHistory();
      setMessages(history);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chat history';
      setError(errorMessage);
      console.error('Chat history error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sendMessage = useCallback(
    async (userMessage: string) => {
      if (!userMessage.trim()) {
        setError('Message cannot be empty');
        return;
      }

      try {
        setError(null);
        setLoading(true);

        const userMsg: ChatMessage = {
          id: Date.now().toString() + '_user',
          role: 'user',
          content: userMessage,
          timestamp: new Date().toISOString(),
        };
        addMessage(userMsg);

        const aiResponse = await sendChatMessage(userMessage);

        const aiMsg: ChatMessage = {
          id: Date.now().toString() + '_ai',
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        };
        addMessage(aiMsg);

        return aiResponse;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        console.error('Chat error:', err);
      } finally {
        setLoading(false);
      }
    },
    [addMessage]
  );

  const clearMessages = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await clearChatHistoryApi();
      setMessages([]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear chat history';
      setError(errorMessage);
      console.error('Clear history error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    addMessage,
    clearMessages,
    setError,
  };
}

export default useChat;
