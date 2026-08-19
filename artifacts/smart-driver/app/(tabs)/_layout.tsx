import React from 'react';
import { Platform, StyleSheet, useColorScheme, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>HOME</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="drive">
        <Icon sf={{ default: 'car', selected: 'car.fill' }} />
        <Label>DRIVE</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="trips">
        <Icon sf={{ default: 'map', selected: 'map.fill' }} />
        <Label>TRIPS</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="insights">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>TELEMETRY</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>SETTINGS</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="account">
        <Icon sf={{ default: 'person.circle', selected: 'person.circle.fill' }} />
        <Label>ACCOUNT</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: isIOS ? 'transparent' : colors.background,
          borderTopWidth: isWeb ? 1 : 0.5,
          borderTopColor: colors.border,
          elevation: 0,
          paddingBottom: insets.bottom,
          ...(isWeb ? { height: 84 } : {}),
        },
        tabBarLabelStyle: {
          fontFamily: 'SpaceGrotesk_600SemiBold',
          fontSize: 10,
          letterSpacing: 0.5,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'HOME',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? <SymbolView name="house.fill" tintColor={color} size={22} /> : <Ionicons name="home" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="drive"
        options={{
          title: 'DRIVE',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? <SymbolView name="car.fill" tintColor={color} size={22} /> : <Ionicons name="navigate" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: 'TRIPS',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? <SymbolView name="map.fill" tintColor={color} size={22} /> : <Ionicons name="map" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'TELEMETRY',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? <SymbolView name="chart.bar.fill" tintColor={color} size={22} /> : <Ionicons name="bar-chart" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'SETTINGS',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? <SymbolView name="gearshape.fill" tintColor={color} size={22} /> : <Ionicons name="settings" size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'ACCOUNT',
          tabBarIcon: ({ color }) =>
            Platform.OS === 'ios' ? <SymbolView name="person.circle.fill" tintColor={color} size={22} /> : <Ionicons name="person-circle" size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) return <NativeTabLayout />;
  return <ClassicTabLayout />;
}
