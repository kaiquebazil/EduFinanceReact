import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import MonthNavigator from '../src/components/MonthNavigator';
import EmptyState from '../src/components/EmptyState';
import { isCredit, creditInvoice, creditInvoiceTotal, invoicePaidTotal, invoiceRemaining, invoiceDueDate, money, monthLabel, dateFull, makeId, parseMoney, atmMask, today, accountBalance } from '../src/lib/finance';
import * as Haptics from 'expo-haptics';

export default function CardInvoiceScreen() {
  const { cardId = '', month = '' } = useLocalSearchParams<{ cardId: string; month: string }>();
  const { state, dispatch, theme, showToast } = useApp();
  const router = useRouter();
  const colors = theme?.colors;
  const palette = theme?.palette;

  const card = state?.accounts?.find((a) => a.id === cardId && isCredit(a));
  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmountDigits, setPayAmountDigits] = useState('');
  const [payDate, setPayDate] = useState(today());
  const [payAccountId, setPayAccountId] = useState('');

  const sm = state?.selectedMonth ?? '';
  const purchases = useMemo(() => card ? creditInvoice(state, card, sm).sort((a, b) => (a?.date ?? '').localeCompare(b?.date ?? '')) : [], [state, card, sm]);
  const invoiceTotal = card ? creditInvoiceTotal(state, card, sm) : 0;
  const paid = card ? invoicePaidTotal(state, card, sm) : 0;
  const remaining = card ? invoiceRemaining(state, card, sm) : 0;

  const sources = (state?.accounts ?? []).filter((a) => !isCredit(a));

  const openPayModal = () => {
    setPayAmountDigits(String(Math.round(remaining * 100)));
    setPayDate(today());
    setPayAccountId(sources?.[0]?.id ?? '');
    setShowPayModal(true);
  };

  const handlePay = () => {
    const amount = parseMoney(atmMask(payAmountDigits));
    if (!amount) { showToast('Valor inválido.'); return; }
    if (amount > remaining + 0.005) { showToast('Valor maior que o restante da fatura.'); return; }
    dispatch({
      type: 'ADD_TRANSACTION',
      payload: {
        id: makeId(),
        type: 'invoice_payment',
        amount,
        date: payDate,
        note: `Pagamento fatura ${monthLabel(sm)}`,
        category: 'Pagamento fatura',
        icon: '🧾',
        cardId,
        invoiceMonth: sm,
        fromAccountId: payAccountId,
      },
    });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setShowPayModal(false);
    showToast('Fatura paga');
  };

  if (!card) return (
    <View style={{ flex: 1, backgroundColor: colors?.background }}>
      <Header title="Fatura" onBack={() => router.back()} />
      <Text style={{ textAlign: 'center', color: colors?.muted, marginTop: 40 }}>Cartão não encontrado.</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header
        title="Fatura do cartão"
        subtitle={`${card.icon} ${card.name} · vence ${dateFull(invoiceDueDate(card, sm))}`}
        value={monthLabel(sm)}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <MonthNavigator />
        <View style={[styles.panel, { backgroundColor: colors?.card, borderColor: colors?.borderLight }]}>
          <View style={styles.row}><Text style={{ color: colors?.muted }}>Valor da fatura</Text><Text style={{ color: colors?.text, fontWeight: '700' }}>{money(invoiceTotal)}</Text></View>
          <View style={styles.row}><Text style={{ color: colors?.muted }}>Pago</Text><Text style={{ color: colors?.income, fontWeight: '700' }}>{money(paid)}</Text></View>
          <View style={styles.row}><Text style={{ fontWeight: '700', color: colors?.text }}>Falta pagar</Text><Text style={{ fontWeight: '700', color: colors?.expense }}>{money(remaining)}</Text></View>
          {remaining > 0 ? (
            <Pressable style={[styles.payBtn, { backgroundColor: palette?.primary }]} onPress={openPayModal}>
              <Text style={styles.payBtnText}>Pagar {money(remaining)}</Text>
            </Pressable>
          ) : invoiceTotal > 0 ? (
            <Text style={{ textAlign: 'center', color: colors?.income, fontWeight: '700', paddingTop: 8 }}>✓ Fatura paga</Text>
          ) : null}
        </View>

        <Text style={[styles.sectionTitle, { color: colors?.text }]}>Compras nesta fatura ({purchases?.length ?? 0})</Text>
        {(purchases?.length ?? 0) > 0 ? purchases.map((tx) => (
          <View key={tx?.id} style={[styles.purchaseRow, { borderColor: colors?.border, backgroundColor: colors?.card }]}>
            <Text style={{ fontSize: 16 }}>{tx?.icon || card.icon}</Text>
            <View style={styles.purchaseInfo}>
              <Text style={[styles.purchaseName, { color: colors?.text }]}>{tx?.category ?? 'Compra'}</Text>
              <Text style={{ color: colors?.muted, fontSize: 11 }}>
                {tx?.installment ? `${tx.installment.current}/${tx.installment.total} parcelas` : 'Compra à vista'} · vence {dateFull(tx?.date ?? '')}
              </Text>
            </View>
            <Text style={{ color: colors?.expense, fontWeight: '700', fontSize: 13 }}>{money(tx?.amount)}</Text>
          </View>
        )) : <EmptyState title="Nenhuma compra nesta fatura" />}
      </ScrollView>

      {/* Pay modal */}
      <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowPayModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors?.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors?.text }]}>Pagar fatura</Text>
            <Text style={{ color: colors?.muted, marginBottom: 16 }}>{card.icon} {card.name} · Restante: {money(remaining)}</Text>
            <Text style={[styles.label, { color: colors?.muted }]}>Pagar com</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {sources.map((a) => (
                <Pressable key={a.id} style={[styles.chip, { borderColor: colors?.border }, payAccountId === a.id && { borderColor: palette?.primary, backgroundColor: '#eff6ff' }]} onPress={() => setPayAccountId(a.id)}>
                  <Text style={[styles.chipText, payAccountId === a.id && { color: palette?.primaryDark }]}>{a.name} ({money(accountBalance(state, a))})</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors?.muted }]}>Valor</Text>
            <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={payAmountDigits ? atmMask(payAmountDigits) : ''} onChangeText={(t) => setPayAmountDigits(t.replace(/\D/g, ''))} keyboardType="numeric" />
            <Text style={[styles.label, { color: colors?.muted }]}>Data</Text>
            <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={payDate} onChangeText={setPayDate} />
            <Pressable style={[styles.payBtn, { backgroundColor: palette?.primary }]} onPress={handlePay}>
              <Text style={styles.payBtnText}>Confirmar pagamento</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 10, marginTop: 14, marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  payBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  payBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderWidth: 1, borderRadius: 14, marginBottom: 8 },
  purchaseInfo: { flex: 1, gap: 4 },
  purchaseName: { fontSize: 13, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: 12 },
  chip: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  chipText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
});
