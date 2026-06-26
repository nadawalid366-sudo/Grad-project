/**
 * useChat Hook
 * Manages chat state and logic with health context awareness
 */

import {
  clearChatHistory as clearChatHistoryApi,
  getChatHistory,
  sendChatMessage,
  type HealthContext,
} from '@/services/aiChatService';
import { useCallback, useEffect, useState } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export function useChat(healthContext?: HealthContext) {
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
      if (Array.isArray(history)) {
        setMessages(history);
      }
    } catch (err) {
      // Don't show an error on initial load failure — chat still works
      console.warn('Chat history load failed (non-fatal):', err);
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

      const userMsg: ChatMessage = {
        id: Date.now().toString() + '_user',
        role: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      try {
        setError(null);
        setLoading(true);
        setMessages((prev) => [...prev, userMsg]);

        const aiResponse = await sendChatMessage(userMessage, healthContext);

        const aiMsg: ChatMessage = {
          id: Date.now().toString() + '_ai',
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMsg]);

        return aiResponse;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
        console.error('Chat error:', err);
      } finally {
        setLoading(false);
      }
    },
    [healthContext]
  );

  const clearMessages = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      await clearChatHistoryApi();
      setMessages([]);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to clear chat history';
      setError(errorMessage);
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
