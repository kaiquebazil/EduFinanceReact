import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import ProgressBar from '../src/components/ProgressBar';
import EmptyState from '../src/components/EmptyState';
import { isCredit, creditUsed, creditInvoiceTotal, money, monthLabel, accountBalance, makeId, parseMoney, atmMask } from '../src/lib/finance';
import ConfirmDialog from '../src/components/ConfirmDialog';
import * as Haptics from 'expo-haptics';

const BRANDS = ['Mastercard', 'Visa', 'Amex', 'Diners', 'Elo', 'Hipercard', 'Outros'];

export default function CreditCardsScreen() {
  const { state, dispatch, theme, showToast } = useApp();
  const router = useRouter();
  const colors = theme?.colors;
  const palette = theme?.palette;

  const total = (state?.accounts ?? []).reduce((s, a) => s + accountBalance(state, a), 0);
  const cards = (state?.accounts ?? []).filter(isCredit);

  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [cardName, setCardName] = useState('');
  const [cardBrand, setCardBrand] = useState('Outros');
  const [cardLimitDigits, setCardLimitDigits] = useState('');
  const [closingDay, setClosingDay] = useState('25');
  const [dueDay, setDueDay] = useState('5');
  const [showDeleteCard, setShowDeleteCard] = useState(false);

  const openNewCard = () => {
    setEditingCard(null);
    setCardName('');
    setCardBrand('Outros');
    setCardLimitDigits('');
    setClosingDay('25');
    setDueDay('5');
    setShowCardModal(true);
  };

  const openEditCard = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (!card) return;
    setEditingCard(cardId);
    setCardName(card.name);
    setCardBrand(card.brand ?? 'Outros');
    setCardLimitDigits(String(Math.round((card.limit ?? 0) * 100)));
    setClosingDay(String(card.closingDay ?? 25));
    setDueDay(String(card.dueDay ?? 5));
    setShowCardModal(true);
  };

  const saveCard = () => {
    const limit = parseMoney(atmMask(cardLimitDigits));
    if (!cardName.trim()) { showToast('Informe o nome do cartão.'); return; }
    if (!limit) { showToast('Informe um limite válido.'); return; }
    if (editingCard) {
      const card = state?.accounts?.find((a) => a.id === editingCard);
      if (card) {
        dispatch({ type: 'UPDATE_ACCOUNT', payload: { ...card, name: cardName.trim(), brand: cardBrand, limit, closingDay: Number(closingDay) || 25, dueDay: Number(dueDay) || 5 } });
        showToast('Cartão atualizado');
      }
    } else {
      dispatch({ type: 'ADD_ACCOUNT', payload: { id: makeId(), name: cardName.trim(), icon: '💳', initialBalance: 0, kind: 'credit', brand: cardBrand, limit, closingDay: Number(closingDay) || 25, dueDay: Number(dueDay) || 5 } });
      showToast('Cartão criado');
    }
    setShowCardModal(false);
  };

  const deleteCard = () => {
    if (editingCard) {
      dispatch({ type: 'DELETE_ACCOUNT', payload: editingCard });
      showToast('Cartão excluído');
    }
    setShowDeleteCard(false);
    setShowCardModal(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Cartões de crédito" subtitle="Gerencie seus cartões" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        {cards?.length > 0 ? cards.map((c) => {
          const used = creditUsed(state, c);
          const available = Math.max(Number(c.limit ?? 0) - used, 0);
          const pct = c.limit ? Math.min((used / c.limit) * 100, 100) : 0;
          const invoice = creditInvoiceTotal(state, c, state?.selectedMonth ?? '');
          return (
            <Pressable key={c.id} style={[styles.card, { backgroundColor: colors?.card, borderColor: colors?.borderLight }]} onPress={() => openEditCard(c.id)}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardName, { color: colors?.text }]}>{c.icon} {c.name}</Text>
                <Text style={{ color: colors?.muted, fontSize: 11 }}>{c.brand} · Fecha dia {c.closingDay} · Vence dia {c.dueDay}</Text>
              </View>
              <ProgressBar percent={pct} heatClass={pct >= 95 ? 'heat-4' : pct >= 80 ? 'heat-3' : undefined} />
              <View style={styles.cardRow}>
                <Text style={{ color: colors?.muted, fontSize: 12 }}>Comprometido {money(used)}</Text>
                <Text style={{ color: colors?.muted, fontSize: 12 }}>Disponível {money(available)}</Text>
              </View>
              <View style={styles.cardRow}>
                <Text style={{ color: colors?.muted, fontSize: 12 }}>Fatura de {monthLabel(state?.selectedMonth ?? '')}</Text>
                <Text style={{ color: colors?.expense, fontSize: 12, fontWeight: '700' }}>{money(invoice)}</Text>
              </View>
            </Pressable>
          );
        }) : <EmptyState title="Nenhum cartão cadastrado" subtitle="Adicione um cartão para começar a parcelar compras." />}

        <Pressable style={[styles.saveBtn, { backgroundColor: palette?.primary }]} onPress={openNewCard}>
          <Text style={styles.saveBtnText}>💳 Adicionar cartão de crédito</Text>
        </Pressable>
      </ScrollView>

      {/* Card modal */}
      <Modal visible={showCardModal} transparent animationType="slide" onRequestClose={() => setShowCardModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShowCardModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors?.card }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors?.text }]}>{editingCard ? 'Editar cartão' : 'Novo cartão de crédito'}</Text>
            <Text style={[styles.label, { color: colors?.muted }]}>Nome</Text>
            <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={cardName} onChangeText={setCardName} placeholder="Ex.: Nubank" placeholderTextColor={colors?.mutedLight} />
            <Text style={[styles.label, { color: colors?.muted }]}>Bandeira</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {BRANDS.map((b) => (
                <Pressable key={b} style={[styles.chip, { borderColor: colors?.border }, cardBrand === b && { borderColor: palette?.primary, backgroundColor: '#eff6ff' }]} onPress={() => setCardBrand(b)}>
                  <Text style={[styles.chipText, cardBrand === b && { color: palette?.primaryDark }]}>{b}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.label, { color: colors?.muted }]}>Limite (R$)</Text>
            <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={cardLimitDigits ? atmMask(cardLimitDigits) : ''} onChangeText={(t) => setCardLimitDigits(t.replace(/\D/g, ''))} keyboardType="numeric" placeholder="R$ 0,00" placeholderTextColor={colors?.mutedLight} />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors?.muted }]}>Dia de fechamento</Text>
                <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={closingDay} onChangeText={setClosingDay} keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: colors?.muted }]}>Dia de vencimento</Text>
                <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={dueDay} onChangeText={setDueDay} keyboardType="numeric" />
              </View>
            </View>
            <Pressable style={[styles.saveBtn, { backgroundColor: palette?.primary }]} onPress={saveCard}>
              <Text style={styles.saveBtnText}>{editingCard ? 'Salvar' : 'Criar cartão'}</Text>
            </Pressable>
            {editingCard ? (
              <Pressable style={[styles.saveBtn, { backgroundColor: '#e11d48', marginTop: 8 }]} onPress={() => setShowDeleteCard(true)}>
                <Text style={styles.saveBtnText}>Excluir cartão</Text>
              </Pressable>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      <ConfirmDialog
        visible={showDeleteCard}
        title="Excluir cartão"
        message="Lançamentos existentes serão mantidos no histórico."
        confirmLabel="Excluir"
        danger
        onConfirm={deleteCard}
        onCancel={() => setShowDeleteCard(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 12, gap: 8 },
  cardHeader: { gap: 4 },
  cardName: { fontSize: 14, fontWeight: '700' },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between' },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 20, maxHeight: '90%' },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: 12 },
  chip: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8 },
  chipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  row: { flexDirection: 'row', gap: 12 },
});
