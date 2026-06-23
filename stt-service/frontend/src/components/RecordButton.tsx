import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator } from 'react-native';

interface RecordButtonProps {
  isRecording: boolean;
  isLoading: boolean;
  elapsed: number;
  onPress: () => void;
}

export const RecordButton: React.FC<RecordButtonProps> = ({
  isRecording,
  isLoading,
  elapsed,
  onPress,
}) => {
  const getLabel = () => {
    if (isLoading) return `Transcribing... ${elapsed}s`;
    if (isRecording) return 'Tap to Stop';
    return 'Tap to Record';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          isRecording && styles.buttonRecording,
          isLoading && styles.buttonLoading,
        ]}
        onPress={onPress}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="large" />
        ) : (
          <View style={isRecording ? styles.square : styles.circle} />
        )}
      </TouchableOpacity>
      <Text style={[styles.text, isLoading && styles.textLoading]}>
        {getLabel()}
      </Text>
      {isLoading && (
        <Text style={styles.hint}>
          Processing on CPU — this takes a few seconds
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 30,
  },
  button: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  buttonRecording: {
    backgroundColor: '#FF3B30',
  },
  buttonLoading: {
    backgroundColor: '#8E8E93',
  },
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
  },
  square: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  textLoading: {
    color: '#8E8E93',
  },
  hint: {
    marginTop: 6,
    fontSize: 12,
    color: '#AEAEB2',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
