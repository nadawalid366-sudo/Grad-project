import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { setUnauthorizedHandler } from '../services/api';
import { getUser, initAuth } from '../services/auth';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  useEffect(() => {
    let active = true;

    // When a request gets a 401, the session is cleared — send the user back
    // to the welcome screen.
    setUnauthorizedHandler(() => {
      router.replace('/(tabs)/splash');
    });

    initAuth().then(() => {
      if (!active) return;
      const user = getUser();
      if (user) {
        // Restore the session: jump straight to the right dashboard.
        router.replace({
          pathname:
            user.role === 'professional' ? '/(tabs)/dochome' : '/(tabs)/home',
          params: { email: user.email, fullName: user.fullName },
        });
      }
    });

    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="payment" options={{ title: 'Payment', headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
