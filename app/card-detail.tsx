import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import ProgressBar from '../src/components/ProgressBar';
import { isCredit, creditUsed, creditInvoiceTotal, invoiceRemaining, money, monthLabel } from '../src/lib/finance';

export default function CardDetailScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { state, theme } = useApp();
  const router = useRouter();
  const colors = theme?.colors;
  const palette = theme?.palette;

  const card = state?.accounts?.find((a) => a.id === id && isCredit(a));
  if (!card) return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Cartão" onBack={() => router.back()} />
      <Text style={{ textAlign: 'center', color: colors?.muted, marginTop: 40 }}>Cartão não encontrado.</Text>
    </View>
  );

  const used = creditUsed(state, card);
  const available = Math.max(Number(card.limit ?? 0) - used, 0);
  const invoice = creditInvoiceTotal(state, card, state?.selectedMonth ?? '');

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header
        title="Cartão de crédito"
        subtitle={`${card.brand ?? 'Cartão'} · vence dia ${card.dueDay}`}
        value={`${card.icon} ${card.name}`}
        onBack={() => router.back()}
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <View style={[styles.panel, { backgroundColor: colors?.card, borderColor: colors?.borderLight }]}>
          <View style={styles.row}><Text style={{ color: colors?.muted }}>Limite total</Text><Text style={{ color: colors?.text, fontWeight: '700' }}>{money(card.limit)}</Text></View>
          <View style={styles.row}><Text style={{ color: colors?.muted }}>Comprometido</Text><Text style={{ color: colors?.text, fontWeight: '700' }}>{money(used)}</Text></View>
          <View style={styles.row}><Text style={{ color: colors?.muted }}>Disponível</Text><Text style={{ color: colors?.text, fontWeight: '700' }}>{money(available)}</Text></View>
          <View style={styles.row}><Text style={{ color: colors?.muted }}>Fatura de {monthLabel(state?.selectedMonth ?? '')}</Text><Text style={{ color: colors?.expense, fontWeight: '700' }}>{money(invoice)}</Text></View>
        </View>
        <View style={styles.actions}>
          <Pressable style={[styles.btn, { borderColor: colors?.border }]} onPress={() => router.push(`/credit-cards`)}>
            <Text style={[styles.btnText, { color: palette?.primary }]}>Editar cartão</Text>
          </Pressable>
          <Pressable style={[styles.btn, { backgroundColor: palette?.primary }]} onPress={() => router.push(`/card-invoice?cardId=${id}&month=${state?.selectedMonth ?? ''}`)}>
            <Text style={[styles.btnText, { color: '#fff' }]}>Ver fatura</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panel: { borderRadius: 18, padding: 16, borderWidth: 1, gap: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  btnText: { fontSize: 14, fontWeight: '700' },
});
