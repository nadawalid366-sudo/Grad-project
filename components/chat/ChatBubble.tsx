/**
 * ChatBubble Component
 * Individual chat message bubble
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export function ChatBubble({ role, content, timestamp }: ChatBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const isUser = role === 'user';
  const bubbleStyle = {
    backgroundColor:
      colorScheme === 'dark'
        ? isUser
          ? colors.tint
          : colors.icon
        : isUser
        ? '#DCF8C6'
        : '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxWidth: 280,
    marginVertical: 4,
  };

  const textColor = colorScheme === 'dark' ? '#FFFFFF' : '#111111';

  const textStyle = {
    color: textColor,
    fontSize: 14,
    lineHeight: 20,
  };

  return (
    <View
      style={[
        styles.container,
        {
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          paddingHorizontal: 12,
        },
      ]}
    >
      <View style={bubbleStyle}>
        <Text style={textStyle}>{content}</Text>
        {timestamp && (
          <Text
            style={{
              fontSize: 11,
              marginTop: 4,
              color: colorScheme === 'dark' ? 'rgba(255,255,255,0.7)' : '#666666',
            }}
          >
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    </View>
  );
}

export default ChatBubble;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 2,
  },
});
