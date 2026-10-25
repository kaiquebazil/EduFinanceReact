import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import * as Haptics from 'expo-haptics';
import type { HomeBalanceMode } from '../src/lib/types';

const modes: { id: HomeBalanceMode; label: string; desc: string; icon: string }[] = [
  { id: 'month', label: 'Saldo do mês', desc: 'Mostra receitas menos despesas no mês selecionado', icon: 'calendar-outline' },
  { id: 'remaining', label: 'Saldo restante', desc: 'Mostra o saldo acumulado de todas as contas', icon: 'wallet-outline' },
];

export default function BalanceDisplayScreen() {
  const { state, dispatch, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const current = state?.homeBalanceMode ?? 'month';

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Exibição de saldo" onBack={() => router.back()} />
      <View style={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}>
        {modes.map((m) => {
          const active = current === m.id;
          return (
            <Pressable
              key={m.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors?.card,
                  borderColor: active ? theme?.palette?.primary : colors?.border,
                  borderWidth: active ? 2 : 1,
                },
              ]}
              onPress={() => {
                dispatch({ type: 'SET_HOME_BALANCE_MODE', payload: m.id });
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              }}
              accessibilityLabel={m.label}
            >
              <View style={styles.row}>
                <Ionicons name={m.icon as any} size={24} color={active ? theme?.palette?.primary : colors?.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: active ? theme?.palette?.primary : colors?.text }]}>{m.label}</Text>
                  <Text style={[styles.desc, { color: colors?.textSecondary }]}>{m.desc}</Text>
                </View>
                {active ? <Ionicons name="checkmark-circle" size={22} color={theme?.palette?.primary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { fontSize: 15, fontWeight: '700' },
  desc: { fontSize: 12, marginTop: 4, lineHeight: 18 },
});
