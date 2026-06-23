import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import { RecordButton } from '../components/RecordButton';
import { TranscriptDisplay } from '../components/TranscriptDisplay';
import { useVoiceToText } from '../hooks/useVoiceToText';

export const VoiceToTextScreen: React.FC = () => {
  const {
    isRecording,
    isLoading,
    elapsed,
    error,
    history,
    startRecording,
    stopRecordingAndTranscribe,
  } = useVoiceToText();

  const handlePress = () => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRecording();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Voice to Text</Text>
          <Text style={styles.subtitle}>Arabic & English Support</Text>
        </View>

        {/* Show error inline instead of an Alert */}
        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        ) : null}

        <TranscriptDisplay history={history} />

        <View style={styles.footer}>
          <RecordButton
            isRecording={isRecording}
            isLoading={isLoading}
            elapsed={elapsed}
            onPress={handlePress}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  errorBanner: {
    backgroundColor: '#FF3B3020',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
    margin: 12,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    color: '#C0392B',
    fontSize: 14,
  },
  footer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 20,
  },
});
