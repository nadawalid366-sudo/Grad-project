import { Audio } from 'expo-av';
import { Platform } from 'react-native';

// ─── Web implementation using the browser MediaRecorder API ──────────────────

class WebRecordingService {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: BlobPart[] = [];
  private blobUrl: string | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop all tracks immediately — we just needed the permission grant
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch {
      return false;
    }
  }

  async startRecording(): Promise<void> {
    // Clean up any previous session first
    await this._reset();

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];

    // Pick a supported MIME type
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : 'audio/webm';

    this.mediaRecorder = new MediaRecorder(stream, { mimeType });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(100); // collect chunks every 100ms
    console.log('Web recording started');
  }

  async stopRecording(): Promise<string | null> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        // Revoke any old blob URL to free memory
        if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
        this.blobUrl = URL.createObjectURL(blob);
        // Stop all media tracks so the mic indicator goes away
        this.mediaRecorder?.stream.getTracks().forEach((t) => t.stop());
        this.mediaRecorder = null;
        console.log('Web recording stopped, blob URL:', this.blobUrl);
        resolve(this.blobUrl);
      };

      this.mediaRecorder.stop();
    });
  }

  private async _reset(): Promise<void> {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach((t) => t.stop());
      this.mediaRecorder = null;
    }
    this.chunks = [];
  }
}

// ─── Native implementation using expo-av ─────────────────────────────────────

class NativeRecordingService {
  private recording: Audio.Recording | null = null;

  async requestPermission(): Promise<boolean> {
    try {
      const permission = await Audio.requestPermissionsAsync();
      return permission.status === 'granted';
    } catch {
      return false;
    }
  }

  async startRecording(): Promise<void> {
    // Always clean up any stale recording before starting a new one
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Ignore — it may already be stopped
      }
      this.recording = null;
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    console.log('Starting native recording...');
    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    this.recording = recording;
    console.log('Native recording started');
  }

  async stopRecording(): Promise<string | null> {
    if (!this.recording) return null;

    try {
      await this.recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = this.recording.getURI();
      console.log('Native recording stopped at', uri);
      return uri;
    } catch (err) {
      console.error('Failed to stop recording', err);
      throw new Error('Failed to stop recording');
    } finally {
      // Always clear the reference so next session starts clean
      this.recording = null;
    }
  }
}

// ─── Export the right implementation for the current platform ─────────────────

const recordingService: WebRecordingService | NativeRecordingService =
  Platform.OS === 'web' ? new WebRecordingService() : new NativeRecordingService();

export { recordingService };

