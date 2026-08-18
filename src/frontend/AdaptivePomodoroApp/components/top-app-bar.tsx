import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { GradientText } from '@/components/gradient-text';
import { DesignColors, DesignFonts, DesignSpacing } from '@/constants/design';

export function TopAppBar({ title }: { title: string }) {
  return (
    <View style={styles.wrapper}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay} />
      <View style={styles.row}>
        <View style={styles.brand}>
          <MaterialIcons name="bubble-chart" size={22} color={DesignColors.primary} />
          <GradientText style={styles.title}>{title}</GradientText>
        </View>
        <View style={styles.avatar}>
          <MaterialIcons name="person" size={20} color={DesignColors.onSurfaceVariant} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,18,27,0.8)',
  },
  row: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: DesignSpacing.containerPadding,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontFamily: DesignFonts.headlineBold,
    fontSize: 20,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DesignColors.surfaceContainerHighest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
});
