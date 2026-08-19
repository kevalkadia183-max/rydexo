import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

async function requestLocationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;
  try {
    const Location = await import('expo-location');
    const { status } = await Location.requestForegroundPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export default function LocationScreen() {
  const insets = useSafeAreaInsets();
  const [requesting, setRequesting] = useState(false);

  const handleAllow = async () => {
    setRequesting(true);
    const granted = await requestLocationPermission();
    setRequesting(false);
    if (granted) {
      router.push('/onboarding/vehicle');
    } else {
      Alert.alert('Location Required', 'Rydexo needs location access to measure your speed and track trips. Please enable it in Settings.', [
        { text: 'Skip for now', onPress: () => router.push('/onboarding/vehicle') },
        { text: 'OK' },
      ]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      {/* Back */}
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={24} color="#A1A1AA" />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: '#00E5FF14', borderColor: '#00E5FF30' }]}>
          <Ionicons name="location" size={52} color="#00E5FF" />
        </View>

        <Text style={styles.title}>LOCATION ACCESS</Text>
        <Text style={styles.subtitle}>Required to measure your speed and record trip routes</Text>

        <View style={styles.reasons}>
          {[
            ['speedometer-outline', 'Calculate GPS speed in real-time'],
            ['navigate-outline', 'Record your trip route and distance'],
            ['map-outline', 'Show your position on the live map'],
            ['analytics-outline', 'Generate accurate trip statistics'],
          ].map(([icon, text]) => (
            <View key={icon} style={styles.reason}>
              <Ionicons name={icon as any} size={18} color="#00E5FF" />
              <Text style={styles.reasonText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.privacy}>
          <Ionicons name="lock-closed-outline" size={16} color="#71717A" />
          <Text style={styles.privacyText}>Location data never leaves your device. No servers, no tracking.</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.allowBtn} onPress={handleAllow} activeOpacity={0.85} disabled={requesting}>
          <LinearGradient colors={['#00E5FF', '#00B8CC']} style={styles.allowGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="location" size={18} color="#000" />
            <Text style={styles.allowText}>{requesting ? 'REQUESTING…' : 'ALLOW LOCATION ACCESS'}</Text>
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={() => router.push('/onboarding/vehicle')}>
          <Text style={styles.skipText}>SKIP FOR NOW</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 28 },
  back: { marginBottom: 16 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconWrap: { width: 100, height: 100, borderRadius: 50, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 24, color: '#FAFAFA', textAlign: 'center', marginBottom: 10, letterSpacing: 1 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#A1A1AA', textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  reasons: { gap: 14, width: '100%' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#0A0A0C', borderRadius: 12, padding: 14 },
  reasonText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#FAFAFA', flex: 1 },
  privacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 20, backgroundColor: '#0A0A0C', borderRadius: 12, padding: 12 },
  privacyText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#71717A', flex: 1, lineHeight: 18 },
  actions: { gap: 10 },
  allowBtn: { borderRadius: 16, overflow: 'hidden' },
  allowGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 17 },
  allowText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#000', letterSpacing: 1 },
  skipBtn: { alignItems: 'center', paddingVertical: 14 },
  skipText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#52525B', letterSpacing: 1 },
});
