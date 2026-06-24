/**
 * RecordButton Component
 * Voice recording button for STT integration
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { transcribeAudio as sttTranscribeAudio } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface RecordButtonProps {
  onTranscriptionComplete: (transcription: string) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  disabled?: boolean;
}

export function RecordButton({
  onTranscriptionComplete,
  onRecordingStart,
  onRecordingStop,
  disabled = false,
}: RecordButtonProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recordingRef = React.useRef<Audio.Recording | null>(null);

  const startRecording = async () => {
    try {
      // Request permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'Microphone access is required for voice recording');
        return;
      }

      // Prepare audio recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();

      recordingRef.current = recording;
      setIsRecording(true);
      onRecordingStart?.();
    } catch (error) {
      Alert.alert('Error', 'Failed to start recording');
      console.error('Recording error:', error);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingRef.current) return;

      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      setIsRecording(false);
      onRecordingStop?.();

      if (!uri) {
        Alert.alert('Error', 'Failed to get recording URI');
        return;
      }

      // Transcribe
      await transcribeAudio(uri);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop recording');
      console.error('Stop recording error:', error);
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (uri: string) => {
    try {
      setIsTranscribing(true);

      const result = await sttTranscribeAudio(uri);
      const transcribedText = result.text || '';

      if (!transcribedText) {
        Alert.alert('No Speech', 'Could not detect any speech. Please try again.');
        return;
      }

      onTranscriptionComplete(transcribedText);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription error';
      Alert.alert('Transcription Error', errorMessage);
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
    } else {
      await startRecording();
    }
  };

  const isLoading = isRecording || isTranscribing;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isRecording ? '#ff3b30' : colors.tint,
          },
        ]}
        onPress={toggleRecording}
        disabled={disabled || isTranscribing}
        activeOpacity={0.7}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <Ionicons
            name={isRecording ? 'stop-circle' : 'mic'}
            size={24}
            color="#ffffff"
          />
        )}
      </TouchableOpacity>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={{ color: colors.text, marginLeft: 8 }}>Recording...</Text>
        </View>
      )}

      {isTranscribing && (
        <View style={styles.recordingIndicator}>
          <ActivityIndicator size="small" color={colors.tint} />
          <Text style={{ color: colors.text, marginLeft: 8 }}>Transcribing...</Text>
        </View>
      )}
    </View>
  );
}

export default RecordButton;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff3b30',
  },
});
