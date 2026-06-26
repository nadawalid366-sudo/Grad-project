/**
 * useVoiceChat Hook
 * Manages voice recording and STT integration
 * Uses the existing STT service for transcription
 */

import { useCallback, useState } from 'react';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

export function useVoiceChat() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);

  const _getSTTServiceUrl = useCallback(() => {
    // Try to get STT service URL from environment or use default
    const constantsAny = Constants as unknown as {
      expoConfig?: { extra?: { EXPO_PUBLIC_STT_URL?: string } };
      manifest2?: { extra?: { EXPO_PUBLIC_STT_URL?: string } };
      manifest?: { extra?: { EXPO_PUBLIC_STT_URL?: string } };
    };

    const sttUrl =
      constantsAny.expoConfig?.extra?.EXPO_PUBLIC_STT_URL ||
      constantsAny.manifest2?.extra?.EXPO_PUBLIC_STT_URL ||
      constantsAny.manifest?.extra?.EXPO_PUBLIC_STT_URL ||
      process.env.EXPO_PUBLIC_STT_URL ||
      'http://localhost:5002'; // Default STT service URL

    return sttUrl;
  }, []);

  const transcribeAudio = useCallback(
    async (audioUri: string): Promise<string> => {
      try {
        setIsTranscribing(true);
        setError(null);

        if (!audioUri) {
          throw new Error('No audio URI provided');
        }

        // Read the audio file
        const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        if (!audioBase64) {
          throw new Error('Failed to read audio file');
        }

        // Get the STT service URL
        const sttUrl = _getSTTServiceUrl();

        // Send to STT service
        const response = await fetch(`${sttUrl}/api/transcribe`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: audioBase64,
            format: 'm4a',
            language: 'en-US',
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Transcription failed');
        }

        const data = await response.json();
        const transcribedText = data.text || '';

        setTranscription(transcribedText);
        return transcribedText;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transcription error';
        setError(errorMessage);
        console.error('Voice transcription error:', err);
        throw err;
      } finally {
        setIsTranscribing(false);
      }
    },
    [_getSTTServiceUrl]
  );

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      setIsRecording(true);
      // Actual recording implementation is handled by RecordButton component
      // This just sets the state
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start recording';
      setError(errorMessage);
      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
  }, []);

  const clearTranscription = useCallback(() => {
    setTranscription(null);
    setError(null);
  }, []);

  return {
    isRecording,
    isTranscribing,
    error,
    transcription,
    startRecording,
    stopRecording,
    transcribeAudio,
    clearTranscription,
    setError,
  };
}

export default useVoiceChat;
