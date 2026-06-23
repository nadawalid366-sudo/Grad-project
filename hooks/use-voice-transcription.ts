import { Audio } from "expo-av";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";
import { transcribeAudio } from "../services/api";

/**
 * Records microphone audio with expo-av (the implementation the
 * speech-intelligence-service ships and verifies — works in Expo Go) and sends
 * it to the Whisper speech-to-text service for transcription.
 *
 * Usage:
 *   const { isRecording, isTranscribing, error, start, stopAndTranscribe } =
 *     useVoiceTranscription();
 *   await start();                          // begin recording
 *   const text = await stopAndTranscribe(); // stop + return transcribed text
 */
export function useVoiceTranscription() {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Native recording handle (expo-av).
  const recordingRef = useRef<Audio.Recording | null>(null);
  // Web recording handles (MediaRecorder).
  const mediaRecorderRef = useRef<any>(null);
  const webChunksRef = useRef<BlobPart[]>([]);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    try {
      if (Platform.OS === "web") {
        const stream = await (navigator as any).mediaDevices.getUserMedia({
          audio: true,
        });
        webChunksRef.current = [];
        const mimeType = (window as any).MediaRecorder?.isTypeSupported?.(
          "audio/webm;codecs=opus",
        )
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const mr = new (window as any).MediaRecorder(stream, { mimeType });
        mr.ondataavailable = (e: any) => {
          if (e.data && e.data.size > 0) webChunksRef.current.push(e.data);
        };
        mr.start(100);
        mediaRecorderRef.current = mr;
        setIsRecording(true);
        return true;
      }

      // ── Native (Expo Go) ──────────────────────────────────────────────
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== "granted") {
        setError("Microphone permission is required to record audio.");
        return false;
      }

      // Clean up any stale recording first.
      if (recordingRef.current) {
        try {
          await recordingRef.current.stopAndUnloadAsync();
        } catch {
          // already stopped
        }
        recordingRef.current = null;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setIsRecording(true);
      return true;
    } catch (e: any) {
      console.log("[voice] start error:", e);
      setError(e?.message || "Could not start recording.");
      setIsRecording(false);
      return false;
    }
  }, []);

  const stopAndTranscribe = useCallback(async (): Promise<string | null> => {
    if (!isRecording) {
      return null;
    }
    setIsRecording(false);

    let uri: string | null = null;
    let durationSeconds = 0;

    try {
      if (Platform.OS === "web") {
        uri = await new Promise<string | null>((resolve) => {
          const mr = mediaRecorderRef.current;
          if (!mr) {
            resolve(null);
            return;
          }
          mr.onstop = () => {
            const blob = new Blob(webChunksRef.current, { type: "audio/webm" });
            mr.stream.getTracks().forEach((t: any) => t.stop());
            mediaRecorderRef.current = null;
            resolve(URL.createObjectURL(blob));
          };
          mr.stop();
        });
      } else {
        const recording = recordingRef.current;
        if (recording) {
          try {
            const status = await recording.getStatusAsync();
            durationSeconds = (status as any)?.durationMillis
              ? (status as any).durationMillis / 1000
              : 0;
          } catch {
            // ignore
          }
          await recording.stopAndUnloadAsync();
          uri = recording.getURI();
          recordingRef.current = null;
        }
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
          () => {},
        );
      }
    } catch (e: any) {
      console.log("[voice] stop error:", e);
    }

    console.log(
      `[voice] recording stopped: uri=${uri} duration=${durationSeconds.toFixed(2)}s`,
    );

    if (!uri) {
      setError("No audio was recorded. Please try again.");
      return null;
    }

    if (Platform.OS !== "web" && durationSeconds > 0 && durationSeconds < 0.4) {
      setError("That was too short. Hold on, speak, then tap Done.");
      return null;
    }

    setIsTranscribing(true);
    try {
      const result = await transcribeAudio(uri);
      const text = (result.text || "").trim();
      console.log(`[voice] transcription result: ${JSON.stringify(result)}`);
      if (!text) {
        setError("No speech detected. Please speak clearly and try again.");
      }
      return text;
    } catch (e: any) {
      console.log("[voice] transcribe error:", e);
      setError(e?.message || "Transcription failed.");
      return null;
    } finally {
      setIsTranscribing(false);
    }
  }, [isRecording]);

  const cancel = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === "web") {
        const mr = mediaRecorderRef.current;
        if (mr && mr.state !== "inactive") {
          mr.stop();
          mr.stream.getTracks().forEach((t: any) => t.stop());
        }
        mediaRecorderRef.current = null;
        webChunksRef.current = [];
      } else if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync().catch(() => {});
        recordingRef.current = null;
        await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(
          () => {},
        );
      }
    } catch {
      // ignore
    }
    setIsRecording(false);
    setIsTranscribing(false);
    setError(null);
  }, []);

  return { isRecording, isTranscribing, error, start, stopAndTranscribe, cancel };
}
