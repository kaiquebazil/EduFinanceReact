import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/store/AppContext';
import { money, monthLabel, inMonth, totals, isCredit, accountBalance, today, dateText, invoiceReminders, addMonths } from '../../src/lib/finance';
import TransactionRow from '../../src/components/TransactionRow';
import EmptyState from '../../src/components/EmptyState';
import MonthNavigator from '../../src/components/MonthNavigator';

export default function HomeScreen() {
  const { state, dispatch, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = theme?.palette;
  const colors = theme?.colors;
  const hideAmounts = state?.hideAmounts;

  const reminderCount = useMemo(() => invoiceReminders(state)?.length ?? 0, [state]);

  const monthTx = useMemo(() => inMonth(state), [state]);
  const movements = useMemo(() => {
    return monthTx.filter((tx) => {
      if (tx?.type === 'expense') {
        const acc = state?.accounts?.find((a) => a.id === tx?.accountId);
        if (isCredit(acc)) return false;
      }
      return true;
    });
  }, [monthTx, state?.accounts]);

  const t = useMemo(() => {
    const base = totals(movements);
    const invPayments = movements.filter((tx) => tx?.type === 'invoice_payment').reduce((s, tx) => s + Number(tx?.amount ?? 0), 0);
    return { income: base.income, expense: base.expense + invPayments };
  }, [movements]);

  const balance = useMemo(() => {
    if (state?.homeBalanceMode === 'remaining') {
      return (state?.accounts ?? []).reduce((sum, a) => sum + accountBalance(state, a), 0);
    }
    return t.income - t.expense;
  }, [state, t]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof movements> = {};
    [...movements]
      .sort((a, b) => (b?.date ?? '').localeCompare(a?.date ?? ''))
      .forEach((tx) => {
        const d = tx?.date ?? '';
        if (!groups[d]) groups[d] = [];
        groups[d].push(tx);
      });
    return Object.entries(groups);
  }, [movements]);

  const monthDate = new Date(`${state?.selectedMonth ?? ''}-01T12:00:00`);
  const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  const monthYear = monthDate.toLocaleDateString('pt-BR', { year: 'numeric' });

  const displayMoney = (val: number) => hideAmounts ? 'R$ ••••' : money(val);

  return (
    <View style={[styles.container, { backgroundColor: colors?.card ?? '#fff' }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette?.primary ?? '#3b82f6', paddingTop: (insets?.top ?? 0) + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/tabs/settings')}>
            <Ionicons name="menu" size={22} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitle}>EduFinance</Text>
          <Pressable style={styles.headerIcon} onPress={() => dispatch({ type: 'TOGGLE_HIDE_AMOUNTS' })}>
            <Ionicons name={hideAmounts ? 'eye-off-outline' : 'eye-outline'} size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/search')}>
            <Ionicons name="search" size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/month-picker')}>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
          </Pressable>
          <Pressable style={styles.headerIcon} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={20} color="#fff" />
            {reminderCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{reminderCount > 9 ? '9+' : reminderCount}</Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>{monthYear}</Text>
            <View style={styles.monthNav}>
              <Pressable onPress={() => dispatch({ type: 'SET_MONTH', payload: addMonths(state?.selectedMonth ?? '', -1) })}>
                <Text style={styles.monthArrow}>‹</Text>
              </Pressable>
              <Pressable onPress={() => router.push('/month-picker')}>
                <Text style={styles.monthName}>{monthName}</Text>
              </Pressable>
              <Pressable onPress={() => dispatch({ type: 'SET_MONTH', payload: addMonths(state?.selectedMonth ?? '', 1) })}>
                <Text style={styles.monthArrow}>›</Text>
              </Pressable>
            </View>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Despesas</Text>
            <Text style={styles.summaryValue}>{displayMoney(t.expense)}</Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Receitas</Text>
            <Text style={styles.summaryValue}>{displayMoney(t.income)}</Text>
          </View>
          <Pressable style={styles.summaryCol} onPress={() => router.push('/balance-display')}>
            <Text style={styles.summaryLabel}>{state?.homeBalanceMode === 'remaining' ? 'Saldo restante' : 'Saldo do mês'}</Text>
            <Text style={styles.summaryValue}>{displayMoney(balance)}</Text>
          </Pressable>
        </View>
      </View>

      {/* Transactions */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors?.text }]}>Movimentações</Text>
          <Pressable onPress={() => router.push('/all-transactions')}>
            <Text style={[styles.link, { color: palette?.primary }]}>Ver todas</Text>
          </Pressable>
        </View>

        {grouped?.length > 0 ? grouped.map(([date, txs]) => {
          const dayDate = new Date(`${date}T12:00:00`);
          const weekday = dayDate.toLocaleDateString('pt-BR', { weekday: 'long' });
          const day = dayDate.toLocaleDateString('pt-BR', { day: '2-digit' });
          const dayTotals = totals(txs ?? []);
          const invPay = (txs ?? []).filter((tx) => tx?.type === 'invoice_payment').reduce((s, tx) => s + Number(tx?.amount ?? 0), 0);
          const dayExpense = dayTotals.expense + invPay;

          return (
            <View key={date} style={styles.dayGroup}>
              <View style={[styles.dayHeading, { backgroundColor: theme?.isDark ? '#172033' : '#f8fafc' }]}>
                <Text style={[styles.dayLabel, { color: colors?.muted }]}>{date === today() ? 'Hoje' : `${day} · ${weekday}`}</Text>
                <Text style={[styles.dayTotal, { color: colors?.muted }]}>
                  {dayExpense > 0 ? `Despesas: ${displayMoney(dayExpense)}` : `Receitas: ${displayMoney(dayTotals.income)}`}
                </Text>
              </View>
              <View style={[styles.txList, { backgroundColor: colors?.card, borderColor: colors?.borderLight }]}>
                {(txs ?? []).map((tx) => (
                  <TransactionRow
                    key={tx?.id}
                    tx={tx}
                    onPress={() => router.push(`/edit-transaction?id=${tx?.id}`)}
                  />
                ))}
              </View>
            </View>
          );
        }) : (
          <EmptyState
            title="Nenhum lançamento neste mês"
            subtitle="Use o botão + para registrar uma movimentação."
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.13)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 17,
    height: 17,
    paddingHorizontal: 4,
    borderRadius: 999,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  summary: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
  },
  summaryCol: { flex: 1, minWidth: 0 },
  summaryLabel: {
    color: 'rgba(255,255,255,0.76)',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  summaryValue: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthArrow: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 17,
  },
  monthName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  content: {
    flex: 1,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  link: { fontSize: 13, fontWeight: '700' },
  dayGroup: { marginBottom: 2 },
  dayHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  dayLabel: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  dayTotal: { fontSize: 11 },
  txList: {
    borderBottomWidth: 1,
  },
});
