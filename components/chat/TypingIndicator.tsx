/**
 * TypingIndicator Component
 * Shows loading state while AI is generating response
 */

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface TypingIndicatorProps {
  color?: string;
}

export function TypingIndicator({ color }: TypingIndicatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const indicatorColor = color || colors.icon;

  const [dots, setDots] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const dotDisplay = '.'.repeat(dots) + '.'.repeat(Math.max(0, 3 - dots));

  return (
    <View style={[styles.container, { paddingHorizontal: 12 }]}>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: indicatorColor,
          },
        ]}
      >
        <View style={styles.dotsContainer}>
          {[0, 1, 2].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.dot,
                {
                  opacity: i < dots ? 1 : 0.3,
                  transform: [
                    {
                      scale: i < dots ? 1 : 0.8,
                    },
                  ],
                  backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#111111',
                },
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

export default TypingIndicator;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: 8,
  },
  bubble: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
});
