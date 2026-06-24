import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Resolves the backend URL based on the platform.
 *
 * Priority:
 *  1. If running on web → always use 127.0.0.1 (same machine)
 *  2. If running on Android emulator → use 10.0.2.2 (loopback alias)
 *  3. Otherwise (physical iOS/Android via Expo Go) → use the IP from app.config.js
 *
 * To change the IP, edit `app.config.js` at the root of /frontend and set BACKEND_IP.
 */
function resolveApiUrl(): string {
  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000';
  }
  if (Platform.OS === 'android') {
    // Check if running in an emulator
    const isEmulator = !Constants.isDevice;
    if (isEmulator) return 'http://10.0.2.2:8000';
  }
  // Physical device — read from app.config.js extra
  const configUrl = Constants.expoConfig?.extra?.backendUrl;
  if (configUrl) return configUrl;
  // Fallback
  return 'http://192.168.1.101:8000';
}

const API_BASE_URL = resolveApiUrl();
console.log(`[ApiService] Using backend: ${API_BASE_URL}`);

export interface TranscriptionResponse {
  success: boolean;
  text: string;
  language?: string;
  processing_time?: number;
  error?: string;
}

export class ApiService {
  /**
   * Uploads an audio file/blob to the transcription API.
   * Handles both React Native (file URI) and Web (blob URL) environments.
   */
  async transcribeAudio(fileUri: string): Promise<TranscriptionResponse> {
    const formData = new FormData();

    if (Platform.OS === 'web') {
      // Browsers give a Blob URL — fetch it and re-attach as a proper File
      const fetchResponse = await fetch(fileUri);
      const blob = await fetchResponse.blob();
      formData.append('file', blob, 'audio.webm');
    } else {
      // React Native passes a local file URI
      let filename = fileUri.split('/').pop() || 'audio.m4a';
      if (!filename.includes('.')) filename += '.m4a';
      const ext = filename.split('.').pop() ?? 'm4a';
      formData.append('file', { uri: fileUri, name: filename, type: `audio/${ext}` } as any);
    }

    console.log(`[ApiService] POST ${API_BASE_URL}/transcribe`);

    const response = await axios.post<TranscriptionResponse>(
      `${API_BASE_URL}/transcribe`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      }
    );

    return response.data;
  }
}

export const apiService = new ApiService();
