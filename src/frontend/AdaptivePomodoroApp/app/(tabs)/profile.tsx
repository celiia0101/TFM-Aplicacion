import { StyleSheet, Text, View } from 'react-native';
import { AtmosphericBackground } from '@/components/atmospheric-background';
import { TopAppBar } from '@/components/top-app-bar';
import { DesignColors, DesignTypography } from '@/constants/design';

export default function ProfileScreen() {
  return (
    <View style={styles.root}>
      <AtmosphericBackground />
      <TopAppBar title="PomodoroIA" />
      <View style={styles.content}>
        <Text style={styles.text}>El perfil llega pronto.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: DesignColors.surface },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  text: { ...DesignTypography.bodyMd, color: DesignColors.onSurfaceVariant, textAlign: 'center' },
});
