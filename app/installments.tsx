import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import EmptyState from '../src/components/EmptyState';
import ProgressBar from '../src/components/ProgressBar';
import { money, monthLabel, isCredit, accountName } from '../src/lib/finance';
import type { InstallmentPurchase } from '../src/lib/types';

export default function InstallmentsScreen() {
  const { state, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const purchases = useMemo(() => {
    const groups: Record<string, InstallmentPurchase> = {};
    (state?.transactions ?? []).forEach((tx) => {
      if (!tx?.installment || !tx?.groupId) return;
      const g = groups[tx.groupId];
      if (!g) {
        groups[tx.groupId] = {
          category: tx?.category ?? '',
          icon: tx?.icon ?? '',
          note: (tx?.note ?? '').replace(/\s*\(\d+\/\d+\)$/, ''),
          borrowedTo: tx?.borrowedTo ?? '',
          accountId: tx?.accountId ?? '',
          purchaseDate: tx?.installment?.purchaseDate ?? tx?.date ?? '',
          totalAmount: tx?.installment?.totalAmount ?? 0,
          total: tx?.installment?.total ?? 0,
          paid: 0,
          paidAmount: 0,
          remaining: 0,
          remainingAmount: 0,
        };
      }
      const purchase = groups[tx.groupId];
      const today = new Date().toISOString().slice(0, 10);
      if (tx.date <= today) {
        purchase.paid++;
        purchase.paidAmount += Number(tx?.amount ?? 0);
      } else {
        purchase.remaining++;
        purchase.remainingAmount += Number(tx?.amount ?? 0);
      }
    });
    return Object.values(groups).filter((p) => p?.remaining > 0)
      .sort((a, b) => (a?.purchaseDate ?? '').localeCompare(b?.purchaseDate ?? ''));
  }, [state?.transactions]);

  const totalRemaining = purchases.reduce((s, p) => s + (p?.remainingAmount ?? 0), 0);

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header
        title="Parcelas"
        subtitle={`${purchases?.length ?? 0} compra(s) parcelada(s)`}
        onBack={() => router.back()}
       
      />
      {(purchases?.length ?? 0) === 0 ? (
        <EmptyState title="Sem parcelas" subtitle="Nenhuma compra parcelada em aberto" />
      ) : (
        <FlatList
          data={purchases ?? []}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}
          ListHeaderComponent={
            <View style={[styles.totalCard, { backgroundColor: colors?.card }]}>
              <Text style={[styles.totalLabel, { color: colors?.textSecondary }]}>Total restante</Text>
              <Text style={[styles.totalValue, { color: colors?.expense }]}>{money(totalRemaining)}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const pct = item?.total ? Math.round(((item?.paid ?? 0) / item.total) * 100) : 0;
            return (
              <View style={[styles.card, { backgroundColor: colors?.card }]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.emoji}>{item?.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardTitle, { color: colors?.text }]} numberOfLines={1}>
                      {item?.note || item?.category}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors?.textSecondary }]}>
                      {accountName(state, item?.accountId)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.cardAmount, { color: colors?.expense }]}>
                      {money(item?.totalAmount)}
                    </Text>
                    <Text style={[styles.cardSub, { color: colors?.textSecondary }]}>
                      {item?.paid}/{item?.total} pagas
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  percent={pct}
                  height={6}
                />
                <Text style={[styles.remaining, { color: colors?.textSecondary }]}>
                  Restam {item?.remaining} parcela(s) · {money(item?.remainingAmount)}
                </Text>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  totalCard: { borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center' },
  totalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  totalValue: { fontSize: 24, fontWeight: '700' },
  card: { borderRadius: 16, padding: 14, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  emoji: { fontSize: 28 },
  cardTitle: { fontSize: 14, fontWeight: '600' },
  cardSub: { fontSize: 11, marginTop: 2 },
  cardAmount: { fontSize: 14, fontWeight: '700' },
  remaining: { fontSize: 11, marginTop: 6 },
});
