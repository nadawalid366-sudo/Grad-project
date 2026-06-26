/**
 * AI Chat API Service
 * Handles all communication with the AI Chat backend
 */

import { API_BASE_URL } from './api';
import { getToken } from './auth';

export interface HealthContext {
  userName?: string;
  calories?: { current: number; goal: number };
  sleep?: { bedtime: string; wakeTime: string };
  water?: { amount: number; unit: string; goal: number };
  medication?: { taken: number; goal: number };
  recentLogs?: { title: string; type: string; timeAgo: string }[];
}

export interface VoiceClassification {
  type: 'meal' | 'exercise' | 'vitals' | 'medication' | 'symptom';
  value: string;
  confidence: number;
}

function getAuthHeader() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Send message to AI Chat backend with optional health context
 */
export async function sendChatMessage(
  message: string,
  healthContext?: HealthContext
): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/ai-chat/message`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ message, healthContext: healthContext || null }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to send message: ${response.statusText}`);
  }

  const data = await response.json();
  return data.reply;
}

/**
 * Classify a voice transcript into a health log category using AI
 */
export async function classifyVoiceInput(transcript: string): Promise<VoiceClassification> {
  const response = await fetch(`${API_BASE_URL}/api/ai-chat/classify-voice`, {
    method: 'POST',
    headers: getAuthHeader(),
    body: JSON.stringify({ transcript }),
  });

  if (!response.ok) {
    // Fallback on error
    return { type: 'symptom', value: transcript, confidence: 0.3 };
  }

  const data = await response.json();
  return {
    type: data.type || 'symptom',
    value: data.value || transcript,
    confidence: data.confidence || 0.5,
  };
}

/**
 * Fetch a proactive daily insight from Aura
 */
export async function fetchDailyInsight(healthContext?: HealthContext): Promise<string | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/ai-chat/daily-insight`, {
      method: 'POST',
      headers: getAuthHeader(),
      body: JSON.stringify({ healthContext: healthContext || null }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    return data.insight || null;
  } catch (err) {
    console.error('Error fetching daily insight:', err);
    return null;
  }
}

/**
 * Get chat history
 */
export async function getChatHistory(limit: number = 50) {
  const response = await fetch(
    `${API_BASE_URL}/api/ai-chat/history?limit=${Math.min(limit, 200)}`,
    { method: 'GET', headers: getAuthHeader() }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to fetch history: ${response.statusText}`);
  }

  const data = await response.json();
  return data.history;
}

/**
 * Clear chat history
 */
export async function clearChatHistory(): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/ai-chat/history`, {
    method: 'DELETE',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to clear history: ${response.statusText}`);
  }

  return true;
}

/**
 * Check AI Chat service health
 */
export async function checkAIChatHealth(): Promise<boolean> {
  const response = await fetch(`${API_BASE_URL}/api/ai-chat/health`, {
    method: 'GET',
    headers: getAuthHeader(),
  });

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.success;
}

export default {
  sendChatMessage,
  classifyVoiceInput,
  getChatHistory,
  clearChatHistory,
  checkAIChatHealth,
};
