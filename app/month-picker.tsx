import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function MonthPickerScreen() {
  const { state, dispatch, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;
  const palette = theme?.palette;

  const [year, setYear] = useState(Number(state?.selectedMonth?.slice(0, 4) ?? new Date().getFullYear()));
  const [selected, setSelected] = useState(Number(state?.selectedMonth?.slice(5, 7) ?? 1) - 1);

  return (
    <View style={[styles.container, { backgroundColor: colors?.card, paddingTop: (insets?.top ?? 0) + 20 }]}>
      <View style={[styles.modal, { backgroundColor: colors?.card }]}>
        <Text style={[styles.title, { color: colors?.text }]}>
          {new Date(year, selected, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase())}
        </Text>

        <View style={styles.yearRow}>
          <Pressable onPress={() => setYear((y) => y - 1)}><Text style={[styles.yearArrow, { color: palette?.primary }]}>‹</Text></Pressable>
          <Text style={[styles.yearText, { color: colors?.muted }]}>{year}</Text>
          <Pressable onPress={() => setYear((y) => y + 1)}><Text style={[styles.yearArrow, { color: palette?.primary }]}>›</Text></Pressable>
        </View>

        <View style={styles.grid}>
          {MONTHS.map((name, i) => (
            <Pressable
              key={i}
              style={[
                styles.monthBtn,
                i === selected && { backgroundColor: palette?.primary, borderColor: palette?.primary },
              ]}
              onPress={() => setSelected(i)}
            >
              <Text style={[
                styles.monthText,
                { color: colors?.text },
                i === selected && { color: '#fff', fontWeight: '700' },
              ]}>
                {name}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable style={styles.actionBtn} onPress={() => router.back()}>
            <Text style={[styles.actionText, { color: palette?.primary }]}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: palette?.primary, borderRadius: 11 }]}
            onPress={() => {
              dispatch({ type: 'SET_MONTH', payload: `${year}-${String(selected + 1).padStart(2, '0')}` });
              router.back();
            }}
          >
            <Text style={[styles.actionText, { color: '#fff' }]}>Confirmar</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  modal: { width: '100%', maxWidth: 360, padding: 22, borderRadius: 16 },
  title: { fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 18 },
  yearRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  yearArrow: { fontSize: 28, paddingHorizontal: 12 },
  yearText: { fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 12 },
  monthBtn: { width: '22%', paddingVertical: 10, borderRadius: 999, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  monthText: { fontSize: 14, textTransform: 'capitalize' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, paddingTop: 10 },
  actionBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { fontSize: 14, fontWeight: '700' },
});
