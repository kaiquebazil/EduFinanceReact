import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import { selectableCategories, money, parseMoney, atmMask, isCredit } from '../src/lib/finance';
import ConfirmDialog from '../src/components/ConfirmDialog';
import * as Haptics from 'expo-haptics';

export default function EditTransactionScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch, theme, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;
  const palette = theme?.palette;

  const tx = useMemo(() => state?.transactions?.find((t) => t?.id === id), [state?.transactions, id]);
  if (!tx) return (
    <View style={[styles.container, { backgroundColor: colors?.card, paddingTop: (insets?.top ?? 0) + 24 }]}>
      <Text style={{ textAlign: 'center', color: colors?.muted }}>Lançamento não encontrado.</Text>
    </View>
  );

  const isCardTx = isCredit(state?.accounts?.find((a) => a.id === tx?.accountId));
  const [type, setType] = useState<'expense' | 'income'>(tx?.type as any ?? 'expense');
  const [selectedCat, setSelectedCat] = useState({ name: tx?.category ?? '', icon: tx?.icon ?? '' });
  const [amountDigits, setAmountDigits] = useState(
    String(Math.round((tx?.amount ?? 0) * 100))
  );
  const [note, setNote] = useState(tx?.note ?? '');
  const [date, setDate] = useState(tx?.date ?? '');
  const [showDelete, setShowDelete] = useState(false);
  const [showInstallmentDelete, setShowInstallmentDelete] = useState(false);

  const cats = useMemo(() => selectableCategories(state, type, selectedCat?.name), [state, type, selectedCat?.name]);
  const effectiveCat = cats.some((c) => c.name === selectedCat?.name) ? selectedCat : cats?.[0] ? { name: cats[0].name, icon: cats[0].icon } : null;

  const amountDisplay = amountDigits ? atmMask(amountDigits) : '';

  const handleSave = () => {
    const amount = parseMoney(amountDisplay);
    if (!amount) { showToast('Informe um valor válido.'); return; }
    dispatch({
      type: 'UPDATE_TRANSACTION',
      payload: {
        ...tx,
        type: type as any,
        amount,
        category: effectiveCat?.name ?? tx?.category ?? '',
        icon: effectiveCat?.icon ?? tx?.icon ?? '',
        note,
        date,
      },
    });
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.back();
    showToast('Lançamento atualizado');
  };

  const handleDelete = () => {
    const grouped = tx?.groupId ? state?.transactions?.filter((t) => t?.groupId === tx?.groupId) : [];
    if ((grouped?.length ?? 0) > 1) {
      setShowDelete(false);
      setShowInstallmentDelete(true);
      return;
    }
    doDelete([tx?.id ?? ''], 'Lançamento excluído');
  };

  const doDelete = (ids: string[], msg: string) => {
    const deleted = state?.transactions?.filter((t) => ids.includes(t?.id ?? '')) ?? [];
    dispatch({ type: 'DELETE_TRANSACTIONS', payload: ids });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    router.back();
    showToast(msg, () => {
      deleted.forEach((d) => dispatch({ type: 'ADD_TRANSACTION', payload: d }));
      showToast('Restaurado');
    });
  };

  // Only expense/income can be edited (transfers/invoice_payments show read-only)
  if (tx?.type === 'transfer' || tx?.type === 'invoice_payment') {
    return (
      <View style={[styles.container, { backgroundColor: colors?.card, paddingTop: (insets?.top ?? 0) + 16 }]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={24} color={colors?.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors?.text }]}>
            {tx?.type === 'invoice_payment' ? 'Pagamento de fatura' : 'Transferência'}
          </Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={{ padding: 20 }}>
          <Text style={{ color: colors?.text, fontSize: 16, marginBottom: 8 }}>Valor: {money(tx?.amount)}</Text>
          <Text style={{ color: colors?.muted, marginBottom: 8 }}>Data: {tx?.date}</Text>
          <Text style={{ color: colors?.muted, marginBottom: 20 }}>Descrição: {tx?.note || '—'}</Text>
          <Pressable
            style={[styles.saveBtn, { backgroundColor: '#e11d48' }]}
            onPress={() => setShowDelete(true)}
          >
            <Text style={styles.saveBtnText}>Excluir lançamento</Text>
          </Pressable>
        </View>
        <ConfirmDialog
          visible={showDelete}
          title="Excluir lançamento"
          message="Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          danger
          onConfirm={() => doDelete([tx?.id ?? ''], 'Lançamento excluído')}
          onCancel={() => setShowDelete(false)}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors?.card }]}>
        <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="chevron-back" size={24} color={colors?.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors?.text }]}>Editar lançamento</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {tx?.installment ? (
            <View style={[styles.installmentBanner, { backgroundColor: '#fef3c7', borderColor: '#fbbf24' }]}>
              <Text style={{ color: '#92400e', fontSize: 12 }}>
                ⚠️ Parcela {tx.installment.current}/{tx.installment.total}. Alterações afetam só esta parcela.
              </Text>
            </View>
          ) : null}

          <View style={[styles.typeSwitch, { backgroundColor: colors?.borderLight }]}>
            <Pressable style={[styles.typeSwitchBtn, type === 'expense' && { backgroundColor: colors?.card }]} onPress={() => setType('expense')}>
              <Text style={[styles.typeSwitchText, type === 'expense' && { color: colors?.expense, fontWeight: '700' }]}>Despesa</Text>
            </Pressable>
            <Pressable style={[styles.typeSwitchBtn, type === 'income' && { backgroundColor: colors?.card }]} onPress={() => setType('income')}>
              <Text style={[styles.typeSwitchText, type === 'income' && { color: colors?.income, fontWeight: '700' }]}>Receita</Text>
            </Pressable>
          </View>

          <TextInput
            style={[styles.amountInput, { color: colors?.text }]}
            value={amountDisplay}
            placeholder="R$ 0,00"
            placeholderTextColor={colors?.border}
            keyboardType="numeric"
            onChangeText={(text) => setAmountDigits(text.replace(/\D/g, ''))}
          />

          <Text style={[styles.label, { color: colors?.muted }]}>Categoria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
            {cats.map((c) => (
              <Pressable
                key={c.name}
                style={[
                  styles.catChip,
                  { borderColor: colors?.border },
                  effectiveCat?.name === c.name && { borderColor: palette?.primary, backgroundColor: theme?.isDark ? '#1e3a5f' : '#eff6ff' },
                ]}
                onPress={() => setSelectedCat({ name: c.name, icon: c.icon })}
              >
                <Text style={[styles.catChipText, effectiveCat?.name === c.name && { color: palette?.primaryDark }]}>
                  {c.icon} {c.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: colors?.muted }]}>Descrição</Text>
          <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={note} onChangeText={setNote} />

          <Text style={[styles.label, { color: colors?.muted, marginTop: 12 }]}>Data</Text>
          <TextInput style={[styles.input, { borderColor: colors?.border, color: colors?.text }]} value={date} onChangeText={setDate} />

          <Pressable style={[styles.saveBtn, { backgroundColor: palette?.primary }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar alterações</Text>
          </Pressable>
          <Pressable style={[styles.saveBtn, { backgroundColor: '#e11d48', marginTop: 8 }]} onPress={() => setShowDelete(true)}>
            <Text style={styles.saveBtnText}>Excluir</Text>
          </Pressable>
        </ScrollView>

        <ConfirmDialog
          visible={showDelete}
          title="Excluir lançamento"
          message="Esta ação não pode ser desfeita."
          confirmLabel="Excluir"
          danger
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
        />
        <ConfirmDialog
          visible={showInstallmentDelete}
          title="Excluir parcela"
          message={`Esta é a parcela ${tx?.installment?.current ?? '?'}/${tx?.installment?.total ?? '?'}. O que deseja excluir?`}
          confirmLabel="Só esta parcela"
          danger
          onConfirm={() => {
            setShowInstallmentDelete(false);
            doDelete([tx?.id ?? ''], 'Parcela excluída');
          }}
          onCancel={() => setShowInstallmentDelete(false)}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  installmentBanner: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 16 },
  typeSwitch: { flexDirection: 'row', padding: 4, borderRadius: 14, gap: 4, marginBottom: 16 },
  typeSwitchBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeSwitchText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  amountInput: { fontSize: 32, fontWeight: '800', textAlign: 'center', paddingVertical: 20, letterSpacing: -1 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  catChip: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: 4 },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
