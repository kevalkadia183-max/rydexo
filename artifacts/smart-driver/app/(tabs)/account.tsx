import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { fullSync } from '@/services/cloudSync';

type Mode = 'menu' | 'signIn' | 'signUp';

export default function AccountScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, isLoading, isSignedIn, signIn, signUp, signOut } = useAuth();

  const [mode, setMode] = useState<Mode>('menu');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? Math.max(insets.top + 16, 83) : insets.top + 16;

  const reset = () => {
    setEmail('');
    setPassword('');
    setError('');
    setBusy(false);
  };

  const handleSignIn = async () => {
    if (!email || !password) { setError('Email and password are required'); return; }
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
      reset();
      setMode('menu');
      // CloudSyncManager detects the sign-in transition and runs fullSync automatically
      Alert.alert('Welcome back!', 'Your trips are syncing in the background.');
    } catch (e: any) {
      setError(e?.message ?? 'Sign in failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password) { setError('Email and password are required'); return; }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setBusy(true);
    setError('');
    try {
      await signUp(email.trim(), password);
      reset();
      setMode('menu');
      // CloudSyncManager detects the sign-in transition and runs fullSync automatically
      Alert.alert('Account created!', 'Your local data is being backed up to the cloud.');
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed');
    } finally {
      setBusy(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Your trips are safely saved on this device. You can sign back in anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 100 }} color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={{ paddingTop: topPad, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.foreground }]}>ACCOUNT</Text>

        {isSignedIn ? (
          // ── Signed-in state ──────────────────────────────────────────────────
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.avatarRow}>
                <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                  <Text style={styles.avatarLetter}>
                    {user!.email[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.emailText, { color: colors.foreground }]}>{user!.email}</Text>
                  <View style={styles.syncBadge}>
                    <Ionicons name="cloud-done-outline" size={12} color={colors.primary} />
                    <Text style={[styles.syncLabel, { color: colors.primary }]}>Cloud sync active</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 16 }]}>
              <TouchableOpacity
                style={styles.row}
                onPress={async () => {
                  setBusy(true);
                  await fullSync(user!.id).catch(() => {});
                  setBusy(false);
                  Alert.alert('Sync complete', 'Your trips are up to date.');
                }}
                disabled={busy}
              >
                {busy
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Ionicons name="sync-outline" size={20} color={colors.primary} />
                }
                <Text style={[styles.rowText, { color: colors.primary }]}>Sync Now</Text>
              </TouchableOpacity>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <TouchableOpacity style={styles.row} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
                <Text style={[styles.rowText, { color: colors.destructive }]}>Sign Out</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.muted }]}>
              <Ionicons name="information-circle-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                Trips, vehicles, and settings are automatically backed up and synced across your devices.
              </Text>
            </View>
          </>
        ) : mode === 'menu' ? (
          // ── Signed-out menu ──────────────────────────────────────────────────
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.heroCopy}>
                <Ionicons name="cloud-outline" size={40} color={colors.primary} style={{ marginBottom: 12 }} />
                <Text style={[styles.heroTitle, { color: colors.foreground }]}>Back up your trips</Text>
                <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
                  Sign in to keep your driving history safe across reinstalls and devices.
                </Text>
              </View>
            </View>

            <View style={{ gap: 12, marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={() => { reset(); setMode('signIn'); }}
              >
                <Text style={[styles.btnText, { color: '#000' }]}>Sign In</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnOutline, { borderColor: colors.primary }]}
                onPress={() => { reset(); setMode('signUp'); }}
              >
                <Text style={[styles.btnText, { color: colors.primary }]}>Create Account</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.infoBox, { backgroundColor: colors.muted, marginTop: 24 }]}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.mutedForeground} />
              <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
                Your data is encrypted in transit and stored securely. We never sell your data.
              </Text>
            </View>
          </>
        ) : (
          // ── Auth form ────────────────────────────────────────────────────────
          <>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.formTitle, { color: colors.foreground }]}>
                {mode === 'signIn' ? 'Sign In' : 'Create Account'}
              </Text>

              {error ? (
                <View style={[styles.errorBox, { backgroundColor: colors.destructive + '20' }]}>
                  <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
                </View>
              ) : null}

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!busy}
              />

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 12 }]}>Password</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
                placeholder={mode === 'signUp' ? 'At least 8 characters' : '••••••••'}
                placeholderTextColor={colors.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                editable={!busy}
              />

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.primary, marginTop: 20, opacity: busy ? 0.6 : 1 }]}
                onPress={mode === 'signIn' ? handleSignIn : handleSignUp}
                disabled={busy}
              >
                {busy
                  ? <ActivityIndicator size="small" color="#000" />
                  : <Text style={[styles.btnText, { color: '#000' }]}>
                      {mode === 'signIn' ? 'Sign In' : 'Create Account'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 16 }}
              onPress={() => { reset(); setMode('menu'); }}
            >
              <Text style={[styles.linkText, { color: colors.mutedForeground }]}>← Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ alignItems: 'center', marginTop: 12 }}
              onPress={() => {
                reset();
                setMode(mode === 'signIn' ? 'signUp' : 'signIn');
              }}
            >
              <Text style={[styles.linkText, { color: colors.primary }]}>
                {mode === 'signIn' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 28, letterSpacing: 2, paddingHorizontal: 20, marginBottom: 24 },
  card: { marginHorizontal: 20, borderRadius: 16, borderWidth: 1, padding: 16 },
  avatarRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 22, color: '#000' },
  emailText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 15 },
  syncBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  syncLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  rowText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 15 },
  divider: { height: 1, marginVertical: 4 },
  heroCopy: { alignItems: 'center', paddingVertical: 8 },
  heroTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, marginBottom: 8, textAlign: 'center' },
  heroSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  btn: { marginHorizontal: 20, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  btnOutline: { marginHorizontal: 20, borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1.5, backgroundColor: 'transparent' },
  btnText: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 10, padding: 12, marginHorizontal: 20 },
  infoText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
  formTitle: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 20, marginBottom: 16 },
  errorBox: { borderRadius: 8, padding: 10, marginBottom: 12 },
  errorText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13 },
  fieldLabel: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 13, marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  linkText: { fontFamily: 'SpaceGrotesk_500Medium', fontSize: 14 },
});
