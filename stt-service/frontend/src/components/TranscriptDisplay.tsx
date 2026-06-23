import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { HistoryItem } from '../hooks/useVoiceToText';

interface TranscriptDisplayProps {
  history: HistoryItem[];
}

export const TranscriptDisplay: React.FC<TranscriptDisplayProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No transcriptions yet.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {history.map((item) => (
        <View key={item.id} style={styles.card}>
          <Text style={styles.transcriptText}>{item.text}</Text>
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>{item.date}</Text>
            {item.language && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.language.toUpperCase()}</Text>
              </View>
            )}
            {item.duration && (
              <Text style={styles.metaText}>{item.duration.toFixed(1)}s</Text>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transcriptText: {
    fontSize: 18,
    color: '#1C1C1E',
    lineHeight: 26,
    marginBottom: 12,
    // Support Arabic RTL text naturally if detected
    textAlign: 'left',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  badge: {
    backgroundColor: '#E5E5EA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3A3A3C',
  },
});
