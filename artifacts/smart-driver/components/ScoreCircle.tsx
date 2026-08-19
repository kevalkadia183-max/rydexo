import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { getScoreLabel, getScoreColor } from '@/services/scoring';
import { useColors } from '@/hooks/useColors';

interface Props {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function ScoreCircle({ score, size = 80, showLabel = true }: Props) {
  const colors = useColors();
  const scoreColor = getScoreColor(score, { primary: colors.primary, success: colors.success, warning: colors.warning, destructive: colors.destructive });
  const label = getScoreLabel(score);

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, score / 100));
  const dash = circumference * progress;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={colors.muted} strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
        />
        {/* Progress */}
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={scoreColor} strokeWidth={strokeWidth}
          fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference * 0.25}
        />
      </Svg>
      <View style={styles.inner}>
        <Text style={[styles.score, { color: scoreColor, fontSize: size * 0.28 }]}>{score}</Text>
        {showLabel && <Text style={[styles.label, { color: colors.mutedForeground, fontSize: size * 0.12 }]}>{label}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  inner: { alignItems: 'center', justifyContent: 'center' },
  score: { fontFamily: 'SpaceGrotesk_700Bold', lineHeight: undefined },
  label: { fontFamily: 'SpaceGrotesk_500Medium', marginTop: 1 },
});
