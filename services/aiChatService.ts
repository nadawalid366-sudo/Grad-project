/**
 * AI Chat API Service
 * Handles all communication with the AI Chat backend
 */

import { getToken } from './auth';

let apiBaseUrl = '';

// Initialize API base URL
export function initializeAIChatAPI(baseUrl: string) {
  apiBaseUrl = baseUrl;
}

/**
 * Send message to AI Chat backend
 */
export async function sendChatMessage(message: string) {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = `${apiBaseUrl}/api/ai-chat/message`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ message }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to send message: ${response.statusText}`);
    }

    const data = await response.json();
    return data.reply;
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

/**
 * Get chat history
 */
export async function getChatHistory(limit: number = 50) {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = `${apiBaseUrl}/api/ai-chat/history?limit=${Math.min(limit, 200)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch history: ${response.statusText}`);
    }

    const data = await response.json();
    return data.history;
  } catch (error) {
    console.error('Error fetching chat history:', error);
    throw error;
  }
}

/**
 * Clear chat history
 */
export async function clearChatHistory() {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = `${apiBaseUrl}/api/ai-chat/history`;

    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to clear history: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
}

/**
 * Check AI Chat service health
 */
export async function checkAIChatHealth() {
  try {
    const token = getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const url = `${apiBaseUrl}/api/ai-chat/health`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Health check failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success;
  } catch (error) {
    console.error('Error checking AI Chat health:', error);
    throw error;
  }
}

export default {
  sendChatMessage,
  getChatHistory,
  clearChatHistory,
  checkAIChatHealth,
  initializeAIChatAPI,
};
