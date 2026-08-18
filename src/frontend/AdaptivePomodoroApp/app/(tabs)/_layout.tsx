import { StyleSheet, View, Text } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { MaterialIcons } from '@expo/vector-icons';
import { HapticTab } from '@/components/haptic-tab';
import { DesignColors, DesignFonts } from '@/constants/design';

type IconName = keyof typeof MaterialIcons.glyphMap;

function TabIcon({ name, label, focused }: { name: IconName; label: string; focused: boolean }) {
  return (
    <View style={[styles.tabIconWrapper, focused && styles.tabIconWrapperActive]}>
      <MaterialIcons name={name} size={22} color={focused ? DesignColors.secondary : DesignColors.onSurfaceVariant} />
      <Text style={[styles.tabLabel, { color: focused ? DesignColors.secondary : DesignColors.onSurfaceVariant }]}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: false,
        tabBarStyle: styles.tabBar,
        tabBarBackground: () => (
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFillObject}>
            <View style={styles.tabBarOverlay} />
          </BlurView>
        ),
      }}
    >
      <Tabs.Screen
        name="focus"
        options={{
          title: 'Focus',
          tabBarIcon: ({ focused }) => <TabIcon name="timer" label="Focus" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Historial',
          tabBarIcon: ({ focused }) => <TabIcon name="history" label="Historial" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ focused }) => <TabIcon name="person" label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
    height: 84,
    paddingTop: 8,
    elevation: 0,
  },
  tabBarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(19,18,27,0.8)',
  },
  tabIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
  },
  tabIconWrapperActive: {
    backgroundColor: 'rgba(68, 226, 205, 0.1)',
  },
  tabLabel: {
    fontFamily: DesignFonts.label,
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
