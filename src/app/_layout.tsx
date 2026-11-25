import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  useFonts,
} from '@expo-google-fonts/rubik';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { StoreProvider } from '@/state/store';
import { C } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ Rubik_400Regular, Rubik_500Medium, Rubik_600SemiBold, Rubik_700Bold });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg }, animation: 'slide_from_left' }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="camera" options={{ animation: 'fade' }} />
          <Stack.Screen name="loading" options={{ animation: 'fade', gestureEnabled: false }} />
          <Stack.Screen name="review" />
          <Stack.Screen name="recipe" />
          <Stack.Screen name="cook" />
          <Stack.Screen name="cooked" options={{ animation: 'fade' }} />
          <Stack.Screen name="staples" />
          <Stack.Screen name="shopping" />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
