/**
 * ChatHeader Component
 * WhatsApp-style chat header with AI assistant info
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ChatHeaderProps {
  onMenuPress?: () => void;
  onInfoPress?: () => void;
}

export function ChatHeader({ onMenuPress, onInfoPress }: ChatHeaderProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <View
      style={[
        styles.container,
        // Use a contrasting header background in dark mode to ensure text remains readable
        {
          backgroundColor: colorScheme === 'dark' ? '#0b2b33' : colors.tint,
          borderBottomColor: colors.tabIconDefault,
        },
      ]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            <Ionicons name="sparkles" size={24} color={colors.tint} />
          </View>
          <View style={styles.onlineIndicator} />
        </View>

        <View style={styles.infoContainer}>
          <Text style={[styles.name, { color: colors.text }]}>AI Assistant</Text>
          <Text style={[styles.status, { color: colorScheme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.8)' }]}> 
            Online • Always available
          </Text>
        </View>
      </View>

      <View style={styles.actionContainer}>
        <TouchableOpacity onPress={onInfoPress} activeOpacity={0.6}>
          <Ionicons name="information-circle-outline" size={24} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onMenuPress} activeOpacity={0.6} style={{ marginLeft: 12 }}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default ChatHeader;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#31a24c',
    borderWidth: 2,
    borderColor: 'white',
  },
  infoContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
