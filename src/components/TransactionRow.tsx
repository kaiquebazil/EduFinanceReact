import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useApp } from '../store/AppContext';
import { money, accountName, isCredit } from '../lib/finance';
import type { Transaction } from '../lib/types';

interface Props {
  tx: Transaction;
  onPress?: () => void;
}

export default function TransactionRow({ tx, onPress }: Props) {
  const { state, theme } = useApp();
  const hideAmounts = state?.hideAmounts;
  const transfer = tx?.type === 'transfer';
  const invoicePayment = tx?.type === 'invoice_payment';
  const card = state?.accounts?.find((a) => a.id === tx?.accountId);
  const isCardTx = !transfer && !invoicePayment && isCredit(card);

  let meta = '';
  if (transfer) {
    meta = `${accountName(state, tx?.fromAccountId)} → ${accountName(state, tx?.toAccountId)}`;
  } else if (invoicePayment) {
    const c = state?.accounts?.find((a) => a.id === tx?.cardId);
    meta = `Pagamento fatura ${c?.icon ?? ''} ${c?.name ?? ''}`;
  } else if (isCardTx) {
    meta = `${card?.icon ?? ''} ${card?.name ?? ''}${tx?.borrowedTo ? ` · Emprestado para ${tx.borrowedTo}` : ''}`;
  } else {
    meta = accountName(state, tx?.accountId);
  }

  const amountColor = transfer ? theme?.colors?.muted
    : (tx?.type === 'income' ? theme?.colors?.income : theme?.colors?.expense);
  const prefix = transfer ? '⇄' : (invoicePayment ? '−' : (tx?.type === 'income' ? '+' : '−'));

  return (
    <Pressable style={styles.container} onPress={onPress} accessibilityRole="button">
      <View style={[styles.iconWrap, { backgroundColor: theme?.isDark ? '#273449' : '#eff6ff' }]}>
        <Text style={styles.icon}>{tx?.icon || '⇄️'}</Text>
      </View>
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <Text style={[styles.name, { color: theme?.colors?.text }]} numberOfLines={1}>
            {tx?.category || 'Transferência'}
          </Text>
          {tx?.installment ? (
            <View style={[styles.badge, { backgroundColor: theme?.isDark ? '#1e3a5f' : '#dbeafe' }]}>
              <Text style={[styles.badgeText, { color: theme?.palette?.primaryDark ?? '#1d4ed8' }]}>
                {tx.installment.current}/{tx.installment.total}
              </Text>
            </View>
          ) : null}
          {isCardTx ? (
            <View style={[styles.badge, { backgroundColor: '#ffe4e6' }]}>
              <Text style={[styles.badgeText, { color: '#f43f5e' }]}>💳</Text>
            </View>
          ) : null}
        </View>
        {tx?.note ? <Text style={[styles.desc, { color: theme?.colors?.textSecondary }]} numberOfLines={1}>{tx.note}</Text> : null}
        <Text style={[styles.meta, { color: theme?.colors?.muted }]} numberOfLines={1}>{meta}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {hideAmounts ? `${prefix} R$ ••••` : `${prefix} ${money(tx?.amount)}`}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    minHeight: 64,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 18 },
  info: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '600' },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  badgeText: { fontSize: 10, fontWeight: '700' },
  desc: { fontSize: 12, marginTop: 2 },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
