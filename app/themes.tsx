import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import { themeOptions } from '../src/lib/finance';
import { palettes as themePalettes } from '../src/theme';
import * as Haptics from 'expo-haptics';
import type { ThemeId, ColorMode } from '../src/lib/types';

const colorModes: { id: ColorMode; label: string; icon: string }[] = [
  { id: 'light', label: 'Claro', icon: 'sunny-outline' },
  { id: 'dark', label: 'Escuro', icon: 'moon-outline' },
  { id: 'system', label: 'Sistema', icon: 'phone-portrait-outline' },
];

export default function ThemesScreen() {
  const { state, dispatch, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const selectTheme = (id: ThemeId) => {
    dispatch({ type: 'SET_THEME', payload: id });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  const selectMode = (id: ColorMode) => {
    dispatch({ type: 'SET_COLOR_MODE', payload: id });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Temas" onBack={() => router.back()} />
      <View style={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}>
        <Text style={[styles.sectionTitle, { color: colors?.text }]}>Cor</Text>
        <View style={styles.grid}>
          {(themeOptions ?? []).map((opt) => {
            const p = themePalettes[opt.id];
            const active = state?.theme === opt.id;
            return (
              <Pressable
                key={opt.id}
                style={[styles.colorBtn, active && { borderColor: p?.primary, borderWidth: 2.5 }]}
                onPress={() => selectTheme(opt.id)}
                accessibilityLabel={`Tema ${opt.label}`}
              >
                <View style={[styles.colorCircle, { backgroundColor: p?.primary }]} />
                <Text style={[styles.colorLabel, { color: active ? p?.primary : colors?.textSecondary }]}>
                  {opt.label}
                </Text>
                {active ? <Ionicons name="checkmark-circle" size={18} color={p?.primary} /> : null}
              </Pressable>
            );
          })}
        </View>

        <Text style={[styles.sectionTitle, { color: colors?.text, marginTop: 24 }]}>Modo</Text>
        <View style={styles.modeRow}>
          {colorModes.map((m) => {
            const active = state?.colorMode === m.id;
            return (
              <Pressable
                key={m.id}
                style={[
                  styles.modeBtn,
                  { backgroundColor: active ? theme?.palette?.primary : colors?.card, borderColor: active ? theme?.palette?.primary : colors?.border },
                ]}
                onPress={() => selectMode(m.id)}
                accessibilityLabel={`Modo ${m.label}`}
              >
                <Ionicons name={m.icon as any} size={20} color={active ? '#fff' : colors?.text} />
                <Text style={[styles.modeLabel, { color: active ? '#fff' : colors?.text }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  colorBtn: {
    width: '30%',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  colorCircle: { width: 36, height: 36, borderRadius: 999 },
  colorLabel: { fontSize: 12, fontWeight: '600' },
  modeRow: { flexDirection: 'row', gap: 10 },
  modeBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1.5,
  },
  modeLabel: { fontSize: 12, fontWeight: '600' },
});
