import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import TransactionRow from '../src/components/TransactionRow';
import EmptyState from '../src/components/EmptyState';
import { money, monthLabel, today, startOfWeek, lastDayOfMonth, dateFull, inMonth } from '../src/lib/finance';
import Svg, { Polyline, Circle as SvgCircle, Line, Text as SvgText } from 'react-native-svg';

export default function CategoryDetailScreen() {
  const { name = '', type = 'expense', filter = 'month' } = useLocalSearchParams<{ name: string; type: string; filter: string }>();
  const { state, theme } = useApp();
  const router = useRouter();
  const colors = theme?.colors;
  const palette = theme?.palette;
  const [sort, setSort] = useState<'date' | 'amount'>('date');
  const decodedName = decodeURIComponent(name);

  const category = useMemo(() => {
    return state?.categories?.[type as 'expense' | 'income']?.find((c) => c.name === decodedName);
  }, [state?.categories, decodedName, type]);

  const entries = useMemo(() => {
    let list = (state?.transactions ?? []).filter((t) => t?.category === decodedName && t?.type === type);
    if (filter === 'day') list = list.filter((t) => t?.date === today());
    else if (filter === 'week') list = list.filter((t) => (t?.date ?? '') >= startOfWeek() && (t?.date ?? '') <= today());
    else if (filter === 'month') list = list.filter((t) => t?.date?.startsWith(state?.selectedMonth ?? ''));
    else if (filter === 'year') list = list.filter((t) => t?.date?.startsWith(state?.selectedMonth?.slice(0, 4) ?? ''));
    return list;
  }, [state, decodedName, type, filter]);

  const total = entries.reduce((s, t) => s + Number(t?.amount ?? 0), 0);
  const average = entries?.length ? total / entries.length : 0;

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      if (sort === 'amount') return Number(b?.amount ?? 0) - Number(a?.amount ?? 0);
      return (b?.date ?? '').localeCompare(a?.date ?? '');
    });
  }, [entries, sort]);

  const periodLabel = filter === 'month' ? monthLabel(state?.selectedMonth ?? '')
    : filter === 'day' ? 'Hoje'
      : filter === 'week' ? 'Esta semana'
        : filter === 'year' ? `Ano ${state?.selectedMonth?.slice(0, 4) ?? ''}`
          : 'Todo o período';

  return (
    <View style={[styles.container, { backgroundColor: colors?.card }]}>
      <Header
        title={`${category?.icon ?? '🏷️'} ${decodedName}`}
        subtitle={periodLabel}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors?.muted }]}>Total</Text>
            <Text style={[styles.summaryValue, { color: colors?.text }]}>{state?.hideAmounts ? 'R$ ••••' : money(total)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors?.muted }]}>Média</Text>
            <Text style={[styles.summaryValue, { color: colors?.text }]}>{money(average)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors?.muted }]}>Lançamentos</Text>
            <Text style={[styles.summaryValue, { color: colors?.text }]}>{entries?.length ?? 0}</Text>
          </View>
        </View>

        {/* Sort */}
        <View style={styles.sortRow}>
          <Text style={[styles.sortTitle, { color: colors?.text }]}>{type === 'income' ? 'Receitas' : 'Despesas'}</Text>
          <View style={[styles.sortPills, { backgroundColor: colors?.borderLight }]}>
            <Pressable style={[styles.sortPill, sort === 'date' && { backgroundColor: colors?.card }]} onPress={() => setSort('date')}>
              <Text style={[styles.sortPillText, sort === 'date' && { color: palette?.primaryDark, fontWeight: '700' }]}>Por data</Text>
            </Pressable>
            <Pressable style={[styles.sortPill, sort === 'amount' && { backgroundColor: colors?.card }]} onPress={() => setSort('amount')}>
              <Text style={[styles.sortPillText, sort === 'amount' && { color: palette?.primaryDark, fontWeight: '700' }]}>Por valor</Text>
            </Pressable>
          </View>
        </View>

        {sortedEntries?.length > 0 ? sortedEntries.map((tx) => (
          <TransactionRow key={tx?.id} tx={tx} onPress={() => router.push(`/edit-transaction?id=${tx?.id}`)} />
        )) : <EmptyState title="Sem lançamentos nessa categoria" subtitle="Escolha outro período ou adicione uma movimentação." />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryItem: { flex: 1, gap: 3 },
  summaryLabel: { fontSize: 11 },
  summaryValue: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  sortRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, marginTop: 8 },
  sortTitle: { fontSize: 14, fontWeight: '600' },
  sortPills: { flexDirection: 'row', padding: 3, borderRadius: 999, gap: 2 },
  sortPill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  sortPillText: { fontSize: 10, color: '#94a3b8' },
});
