import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useApp } from '../store/AppContext';
import { addMonths, monthLabel } from '../lib/finance';
import { useRouter } from 'expo-router';

interface MonthNavigatorProps {
  white?: boolean;
}

export default function MonthNavigator({ white }: MonthNavigatorProps) {
  const { state, dispatch, theme } = useApp();
  const router = useRouter();
  const m = state?.selectedMonth ?? '';
  const color = white ? '#fff' : theme?.colors?.text ?? '#0f172a';

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.arrow}
        onPress={() => dispatch({ type: 'SET_MONTH', payload: addMonths(m, -1) })}
        accessibilityLabel="Mês anterior"
      >
        <Text style={[styles.arrowText, { color }]}>‹</Text>
      </Pressable>
      <Pressable onPress={() => router.push('/month-picker')} accessibilityLabel="Escolher mês">
        <Text style={[styles.label, { color }]}>{monthLabel(m)}</Text>
      </Pressable>
      <Pressable
        style={styles.arrow}
        onPress={() => dispatch({ type: 'SET_MONTH', payload: addMonths(m, 1) })}
        accessibilityLabel="Próximo mês"
      >
        <Text style={[styles.arrowText, { color }]}>›</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 24,
    fontWeight: '300',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
