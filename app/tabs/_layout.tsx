import React from 'react';
import { Tabs } from 'expo-router';
import { View, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { theme } = useApp();
  const palette = theme?.palette;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme?.isDark ? 'rgba(17,24,39,0.94)' : 'rgba(255,255,255,0.92)',
          borderTopColor: theme?.colors?.border ?? '#e2e8f0',
          borderTopWidth: 1,
          height: 60 + (insets?.bottom ?? 0),
          paddingBottom: insets?.bottom ?? 0,
          ...(Platform.OS === 'web' ? { position: 'fixed' as any, bottom: 0, left: 0, right: 0, zIndex: 100 } : {}),
        },
        tabBarActiveTintColor: palette?.primary ?? '#3b82f6',
        tabBarInactiveTintColor: theme?.colors?.mutedLight ?? '#94a3b8',
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Gráficos',
          tabBarIcon: ({ color, size }) => <Ionicons name="pie-chart-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="add-placeholder"
        options={{
          title: '',
          tabBarButton: () => (
            <View style={fabStyles.container}>
              <Pressable
                style={fabStyles.button}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                  router.push('/add-transaction');
                }}
                accessibilityLabel="Novo lançamento"
              >
                <View style={[fabStyles.gradient, { backgroundColor: palette?.primary ?? '#3b82f6' }]}>
                  <Ionicons name="add" size={32} color="#fff" />
                </View>
              </Pressable>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Orçamento',
          tabBarIcon: ({ color, size }) => <Ionicons name="flag-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const fabStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    top: -20,
    width: 64,
  },
  button: {
    width: 58,
    height: 58,
    borderRadius: 20,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  gradient: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
});
