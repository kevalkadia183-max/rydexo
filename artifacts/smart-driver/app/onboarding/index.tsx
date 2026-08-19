import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { loadSeedData } from '@/services/seedData';

const FEATURES = [
  { icon: 'speedometer', label: 'Precision Tracking', desc: 'Real-time GPS speed with smooth filtering' },
  { icon: 'scan-circle', label: 'HUD Mode', desc: 'Windshield projection for night driving' },
  { icon: 'analytics', label: 'Trip Telemetry', desc: 'Detailed analytics on speed and braking' },
  { icon: 'shield-checkmark', label: 'Speed Awareness', desc: 'Configurable limits with haptic alerts' },
];

export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const { refreshSettings } = useApp();

  const handleTrySampleData = async () => {
    setLoading(true);
    try {
      await loadSeedData(false);
      await refreshSettings(); // sync AppContext so _layout guard sees onboardingComplete: true
      router.replace('/(tabs)');
    } catch {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <LinearGradient colors={['#00E5FF15', '#000000']} style={StyleSheet.absoluteFill} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 0.5 }} />

      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>

        {/* Ignition Button Logo */}
        <View style={styles.logoWrap}>
          <View style={styles.logoOuter}>
            <View style={[styles.logoInner, { backgroundColor: '#00E5FF10', borderColor: '#00E5FF40' }]}>
              <Ionicons name="speedometer" size={42} color="#00E5FF" />
            </View>
          </View>
        </View>

        <Text style={styles.appName}>RYDEXO</Text>
        <Text style={styles.tagline}>The driver's cockpit{'\n'}in your pocket.</Text>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.icon} style={styles.featureRow}>
              <View style={[styles.featureIcon, { backgroundColor: '#00E5FF10', borderColor: '#00E5FF20', borderWidth: 1 }]}>
                <Ionicons name={f.icon as any} size={18} color="#00E5FF" />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureLabel}>{f.label}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.cta} onPress={() => router.push('/onboarding/location')} activeOpacity={0.85}>
          <LinearGradient colors={['#00E5FF', '#00B8CC']} style={styles.ctaGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.ctaText}>INITIALIZE</Text>
            <Ionicons name="power" size={18} color="#000" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.demoBtn} onPress={handleTrySampleData} activeOpacity={0.7} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#00E5FF" />
            : <Text style={styles.demoBtnText}>TRY WITH SAMPLE DATA</Text>
          }
        </TouchableOpacity>

        <Text style={styles.privacy}>Location data never leaves your device.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 32 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoOuter: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#0A0A0C', borderWidth: 2, borderColor: '#1F1F23', alignItems: 'center', justifyContent: 'center' },
  logoInner: { width: 70, height: 70, borderRadius: 35, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  appName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 36, color: '#FFFFFF', textAlign: 'center', letterSpacing: 4 },
  tagline: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#A1A1AA', textAlign: 'center', marginTop: 8, marginBottom: 44, lineHeight: 24, letterSpacing: 0.5 },
  features: { gap: 18, flex: 1, marginTop: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  featureIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureLabel: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15, color: '#FFFFFF', letterSpacing: 0.5 },
  featureDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#71717A', marginTop: 2 },
  cta: { borderRadius: 16, overflow: 'hidden', marginTop: 24 },
  ctaGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  ctaText: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 15, color: '#000', letterSpacing: 2 },
  demoBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 14, marginTop: 8, minHeight: 44 },
  demoBtnText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, color: '#00E5FF', opacity: 0.8, letterSpacing: 1 },
  privacy: { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#52525B', textAlign: 'center', marginTop: 4 },
});
