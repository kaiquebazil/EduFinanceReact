import React, { useMemo } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import EmptyState from '../src/components/EmptyState';
import { money, monthLabel, isCredit, invoiceRemaining, invoiceDueDate, currentMonth, addMonths } from '../src/lib/finance';
import type { InvoiceReminder } from '../src/lib/types';

export default function NotificationsScreen() {
  const { state, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const reminders = useMemo((): InvoiceReminder[] => {
    const cards = (state?.accounts ?? []).filter(isCredit);
    const cm = currentMonth();
    const result: InvoiceReminder[] = [];
    cards.forEach((card) => {
      [cm, addMonths(cm, 1)].forEach((month) => {
        const rem = invoiceRemaining(state, card, month);
        if (rem > 0) {
          result.push({ card, month, dueDate: invoiceDueDate(card, month), remaining: rem });
        }
      });
    });
    return result.sort((a, b) => (a?.dueDate ?? '').localeCompare(b?.dueDate ?? ''));
  }, [state]);

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Notificações" subtitle="Faturas pendentes" onBack={() => router.back()} />
      {(reminders?.length ?? 0) === 0 ? (
        <EmptyState title="Tudo certo!" subtitle="Nenhuma fatura pendente de pagamento" />
      ) : (
        <FlatList
          data={reminders ?? []}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, { backgroundColor: colors?.card }]}
              onPress={() => router.push({ pathname: '/card-invoice', params: { cardId: item?.card?.id, month: item?.month } })}
            >
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors?.expense + '20' }]}>
                  <Ionicons name="card-outline" size={20} color={colors?.expense} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardName, { color: colors?.text }]}>{item?.card?.name}</Text>
                  <Text style={[styles.monthText, { color: colors?.textSecondary }]}>{monthLabel(item?.month)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amount, { color: colors?.expense }]}>{money(item?.remaining)}</Text>
                  <Text style={[styles.due, { color: colors?.muted }]}>Vence {item?.dueDate?.slice(8, 10)}/{item?.dueDate?.slice(5, 7)}</Text>
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
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cardName: { fontSize: 14, fontWeight: '700' },
  monthText: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700' },
  due: { fontSize: 11, marginTop: 2 },
});
