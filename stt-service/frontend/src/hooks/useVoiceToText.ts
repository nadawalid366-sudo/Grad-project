import { useState, useCallback, useRef, useEffect } from 'react';
import { recordingService } from '../services/RecordingService';
import { apiService, TranscriptionResponse } from '../services/ApiService';

export interface HistoryItem {
  id: string;
  text: string;
  date: string;
  language?: string;
  duration?: number;
}

export const useVoiceToText = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [elapsed, setElapsed] = useState(0); // seconds waiting for transcription
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start a live elapsed timer when loading so the user sees progress
  useEffect(() => {
    if (isLoading) {
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed((s) => s + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isLoading]);

  const startRecording = useCallback(async () => {
    setError(null);
    const hasPermission = await recordingService.requestPermission();
    if (!hasPermission) {
      setError('Microphone permission is required. Please allow access and try again.');
      return;
    }

    try {
      await recordingService.startRecording();
      setIsRecording(true);
    } catch (err: any) {
      setError(`Could not start recording: ${err?.message || 'Unknown error'}`);
      setIsRecording(false);
    }
  }, []);

  const stopRecordingAndTranscribe = useCallback(async () => {
    setIsRecording(false);
    setIsLoading(true);
    setError(null);

    try {
      const uri = await recordingService.stopRecording();
      if (!uri) {
        throw new Error('No audio file was recorded. Please try again.');
      }

      console.log('Audio URI:', uri);

      let result: TranscriptionResponse;
      try {
        result = await apiService.transcribeAudio(uri);
      } catch (uploadErr: any) {
        // Surface the real axios/network error to the user
        const detail =
          uploadErr?.response?.data?.detail ||
          uploadErr?.response?.data?.error ||
          uploadErr?.message ||
          'Network error — is the backend running?';
        throw new Error(detail);
      }

      if (result.success && result.text) {
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          text: result.text,
          date: new Date().toLocaleString(),
          language: result.language,
          duration: result.processing_time,
        };
        setHistory((prev) => [newItem, ...prev]);
      } else {
        throw new Error(result.error || 'Transcription returned empty text.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isRecording,
    isLoading,
    elapsed,
    error,
    history,
    startRecording,
    stopRecordingAndTranscribe,
  };
};
