import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import TransactionRow from '../src/components/TransactionRow';
import EmptyState from '../src/components/EmptyState';
import { inMonth, monthLabel, isCredit, today, dateText } from '../src/lib/finance';

export default function AllTransactionsScreen() {
  const { state, theme } = useApp();
  const router = useRouter();
  const colors = theme?.colors;

  const movements = useMemo(() => {
    return inMonth(state).filter((tx) => {
      if (tx?.type === 'expense') {
        const acc = state?.accounts?.find((a) => a.id === tx?.accountId);
        if (isCredit(acc)) return false;
      }
      return true;
    });
  }, [state]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof movements> = {};
    [...movements].sort((a, b) => (b?.date ?? '').localeCompare(a?.date ?? '')).forEach((tx) => {
      const d = tx?.date ?? '';
      if (!groups[d]) groups[d] = [];
      groups[d].push(tx);
    });
    return Object.entries(groups);
  }, [movements]);

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header
        title="Todos os lançamentos"
        subtitle={monthLabel(state?.selectedMonth ?? '')}
        value="Histórico"
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {grouped?.length > 0 ? grouped.map(([date, txs]) => (
          <View key={date}>
            <View style={[styles.dayHeading, { backgroundColor: theme?.isDark ? '#172033' : '#f8fafc' }]}>
              <Text style={[styles.dayLabel, { color: colors?.muted }]}>{date === today() ? 'Hoje' : dateText(date)}</Text>
            </View>
            {(txs ?? []).map((tx) => (
              <TransactionRow key={tx?.id} tx={tx} onPress={() => router.push(`/edit-transaction?id=${tx?.id}`)} />
            ))}
          </View>
        )) : <EmptyState title="Nenhum lançamento neste período." />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  dayHeading: { paddingHorizontal: 14, paddingVertical: 8 },
  dayLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
});
