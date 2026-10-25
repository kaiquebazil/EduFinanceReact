import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import EmptyState from '../src/components/EmptyState';
import { money, monthLabel, isCredit, creditInvoiceTotal, invoicePaidTotal, invoiceRemaining, invoiceDueDate, addMonths, currentMonth } from '../src/lib/finance';
import type { Account } from '../src/lib/types';

export default function InvoicesScreen() {
  const { state, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const cards = useMemo(() => (state?.accounts ?? []).filter(isCredit), [state?.accounts]);

  const invoices = useMemo(() => {
    const result: { card: Account; month: string; total: number; paid: number; remaining: number; dueDate: string }[] = [];
    const cm = currentMonth();
    cards.forEach((card) => {
      for (let i = -2; i <= 3; i++) {
        const m = addMonths(cm, i);
        const total = creditInvoiceTotal(state, card, m);
        if (total <= 0) continue;
        const paid = invoicePaidTotal(state, card, m);
        const rem = invoiceRemaining(state, card, m);
        result.push({
          card,
          month: m,
          total,
          paid,
          remaining: rem,
          dueDate: invoiceDueDate(card, m),
        });
      }
    });
    return result.sort((a, b) => (a?.dueDate ?? '').localeCompare(b?.dueDate ?? ''));
  }, [state, cards]);

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Faturas" subtitle="Todas as faturas dos cartões" onBack={() => router.back()} />
      {(invoices?.length ?? 0) === 0 ? (
        <EmptyState title="Sem faturas" subtitle="Nenhum cartão de crédito cadastrado ou sem lançamentos" />
      ) : (
        <FlatList
          data={invoices ?? []}
          keyExtractor={(item, i) => `${item?.card?.id}-${item?.month}-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors?.card }]}
              onPress={() => router.push({ pathname: '/card-invoice', params: { cardId: item?.card?.id, month: item?.month } })}
              accessibilityLabel={`Fatura ${item?.card?.name} ${monthLabel(item?.month)}`}
            >
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: colors?.text }]}>{item?.card?.name}</Text>
                  <Text style={[styles.monthText, { color: colors?.textSecondary }]}>{monthLabel(item?.month)}</Text>
                  <Text style={[styles.due, { color: colors?.muted }]}>Vence {item?.dueDate?.slice(8, 10)}/{item?.dueDate?.slice(5, 7)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.total, { color: colors?.text }]}>{money(item?.total)}</Text>
                  {(item?.remaining ?? 0) > 0 ? (
                    <Text style={[styles.rem, { color: colors?.expense }]}>Aberto: {money(item?.remaining)}</Text>
                  ) : (
                    <Text style={[styles.rem, { color: colors?.income }]}>Paga ✓</Text>
                  )}
                </View>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 16, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardName: { fontSize: 14, fontWeight: '700' },
  monthText: { fontSize: 12, marginTop: 2 },
  due: { fontSize: 11, marginTop: 2 },
  total: { fontSize: 15, fontWeight: '700' },
  rem: { fontSize: 11, marginTop: 2, fontWeight: '600' },
});
