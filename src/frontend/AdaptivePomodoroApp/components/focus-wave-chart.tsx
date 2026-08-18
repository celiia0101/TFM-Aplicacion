import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { DesignColors, DesignFonts } from '@/constants/design';

const VIEW_WIDTH = 400;
const VIEW_HEIGHT = 150;
const TOP_PADDING = 15;

function buildAreaPath(values: number[]): string {
  if (values.length === 0) return '';

  const max = Math.max(...values, 1);
  const stepX = VIEW_WIDTH / (values.length - 1 || 1);
  const points = values.map((v, i) => ({
    x: i * stepX,
    y: VIEW_HEIGHT - TOP_PADDING - (v / max) * (VIEW_HEIGHT - TOP_PADDING * 2),
  }));

  let d = `M0,${VIEW_HEIGHT} L${points[0].x},${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const midX = (prev.x + curr.x) / 2;
    const midY = (prev.y + curr.y) / 2;
    d += ` Q${prev.x},${prev.y} ${midX},${midY} Q${midX},${midY} ${curr.x},${curr.y}`;
  }
  d += ` L${VIEW_WIDTH},${VIEW_HEIGHT} Z`;
  return d;
}

export function FocusWaveChart({ data, labels }: { data: number[]; labels: string[] }) {
  const path = buildAreaPath(data);

  // Respiración sutil de la ola, en línea con el resto del sistema de diseño
  // (ver DESIGN.md: la interfaz debe sentirse "viva").
  const breathe = useSharedValue(0);
  useEffect(() => {
    breathe.value = withRepeat(withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [breathe]);
  const breatheStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + breathe.value * 0.06 }],
    opacity: 0.75 + breathe.value * 0.25,
  }));

  return (
    <View>
      <View style={styles.chart}>
        <Animated.View style={[styles.chartInner, breatheStyle]}>
          <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} preserveAspectRatio="none">
            <Defs>
              <LinearGradient id="wave-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor={DesignColors.primary} stopOpacity={0.6} />
                <Stop offset="100%" stopColor={DesignColors.secondary} stopOpacity={0.1} />
              </LinearGradient>
            </Defs>
            <Path d={path} fill="url(#wave-gradient)" />
          </Svg>
        </Animated.View>
      </View>
      <View style={styles.daysRow}>
        {labels.map((day, i) => (
          <Text key={`${day}-${i}`} style={styles.dayLabel}>
            {day}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    height: 160,
    width: '100%',
    overflow: 'hidden',
  },
  chartInner: {
    flex: 1,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayLabel: {
    fontFamily: DesignFonts.label,
    fontSize: 11,
    letterSpacing: 0.6,
    color: DesignColors.onSurfaceVariant,
  },
});
