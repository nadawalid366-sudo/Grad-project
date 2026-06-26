import React, { useRef, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getUser } from '../../services/auth';

export function FloatingAura() {
  const router = useRouter();
  const floatAnim = useRef(new Animated.Value(0)).current;
  const user = getUser();
  const isDoctor = user?.role === 'professional';

  useEffect(() => {
    if (isDoctor) return;
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 1500, useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [floatAnim, isDoctor]);

  // Doctors use a professional dashboard — no patient AI chat button
  if (isDoctor) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: floatAnim }] }]}>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={() => router.push('/(tabs)/ai-chat')}
      >
        <MaterialCommunityIcons name="robot-outline" size={28} color="#FFFFFF" />
        <View style={styles.badge} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 110,
    zIndex: 9999,
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#2563EB',
  },
});
