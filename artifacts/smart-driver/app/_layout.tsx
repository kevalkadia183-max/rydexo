import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import {
  Inter_400Regular,
  Inter_500Medium,
  useFonts as useInterFonts,
} from '@expo-google-fonts/inter';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts as useSpaceGroteskFonts,
} from '@expo-google-fonts/space-grotesk';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AppProvider, useApp } from '@/context/AppContext';
import { VehicleProvider } from '@/context/VehicleContext';
import { TripProvider } from '@/context/TripContext';
import { AuthProvider } from '@/context/AuthContext';
import { CloudSyncManager } from '@/context/CloudSyncManager';
import { setApiBaseUrl } from '@/services/api';
import { setAiBaseUrl } from '@/services/aiCoaching';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// Configure API base URL for the custom fetch layer.
// On web (Expo preview) the API is same-origin so no base URL needed.
// For native builds set EXPO_PUBLIC_API_BASE_URL to the full server URL.
const apiBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';
setApiBaseUrl(apiBase);
setAiBaseUrl(apiBase);

function RootLayoutNav() {
  const router = useRouter();
  const segments = useSegments();
  const { settings, isLoading } = useApp();

  useEffect(() => {
    if (isLoading) return;
    const inOnboarding = segments[0] === 'onboarding';
    if (!settings.onboardingComplete && !inOnboarding) {
      router.replace('/onboarding');
    }
  }, [settings.onboardingComplete, isLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen
        name="trip/[id]"
        options={{ headerShown: false, presentation: 'card' }}
      />
      <Stack.Screen
        name="vehicles/index"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="vehicles/new"
        options={{ headerShown: false, presentation: 'modal' }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [interLoaded, interError] = useInterFonts({
    Inter_400Regular,
    Inter_500Medium,
  });

  const [sgLoaded, sgError] = useSpaceGroteskFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  const fontsLoaded = interLoaded && sgLoaded;
  const fontError = interError || sgError;

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <AuthProvider>
                <AppProvider>
                  <VehicleProvider>
                    <TripProvider>
                      <CloudSyncManager>
                        <RootLayoutNav />
                      </CloudSyncManager>
                    </TripProvider>
                  </VehicleProvider>
                </AppProvider>
              </AuthProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
