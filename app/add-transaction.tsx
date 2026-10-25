import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Platform, Switch, KeyboardAvoidingView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import { selectableCategories, makeId, today, monthOf, buildInstallments, atmMask, parseMoney, addMonths, lastDayOfMonth, invoiceMonthFor, isCredit, currentMonth } from '../src/lib/finance';
import * as Haptics from 'expo-haptics';

export default function AddTransactionScreen() {
  const { state, dispatch, theme, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;
  const palette = theme?.palette;

  // Form state preserved across type/category/payment changes
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountDigits, setAmountDigits] = useState('');
  const [selectedCat, setSelectedCat] = useState<{ name: string; icon: string } | null>(null);
  const [payment, setPayment] = useState<'account' | 'credit'>('account');
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(today());
  const [firstDueDate, setFirstDueDate] = useState('');
  const [borrowedTo, setBorrowedTo] = useState('');
  const [repeat, setRepeat] = useState(false);
  const [catSearch, setCatSearch] = useState('');

  const cards = useMemo(() => (state?.accounts ?? []).filter(isCredit), [state?.accounts]);
  const nonCredit = useMemo(() => (state?.accounts ?? []).filter((a) => !isCredit(a)), [state?.accounts]);
  const defaultAccountId = nonCredit?.[0]?.id ?? 'bank';
  const hasCards = (cards?.length ?? 0) > 0;

  const cats = useMemo(() => {
    const all = selectableCategories(state, type, selectedCat?.name);
    const q = catSearch.trim().toLocaleLowerCase('pt-BR');
    return q ? all.filter((c) => c.name.toLocaleLowerCase('pt-BR').includes(q)) : all;
  }, [state, type, selectedCat?.name, catSearch]);

  // Auto-select first category if none selected
  const effectiveCat = useMemo(() => {
    if (selectedCat && cats.some((c) => c.name === selectedCat.name)) return selectedCat;
    return cats?.[0] ? { name: cats[0].name, icon: cats[0].icon } : null;
  }, [selectedCat, cats]);

  const defaultFirstDueDate = useCallback((cid?: string) => {
    const card = cards.find((c) => c.id === (cid || cardId));
    if (!card) return today();
    const month = addMonths(monthOf(date), 1);
    const day = Math.min(Number(card?.dueDay ?? 5), lastDayOfMonth(month));
    return `${month}-${String(day).padStart(2, '0')}`;
  }, [cards, cardId, date]);

  // Initialize cardId and firstDueDate
  React.useEffect(() => {
    if (hasCards && !cardId) {
      setCardId(cards[0]?.id ?? '');
      setFirstDueDate(defaultFirstDueDate(cards[0]?.id));
    }
  }, [hasCards]);

  const amountDisplay = amountDigits ? atmMask(amountDigits) : '';

  const handleSave = () => {
    const amount = parseMoney(amountDisplay);
    if (!amount) { showToast('Informe um valor válido.'); return; }
    if (!effectiveCat) { showToast('Selecione uma categoria.'); return; }

    if (payment === 'credit' && type === 'expense' && hasCards) {
      const card = cards.find((a) => a.id === cardId);
      if (!card) { showToast('Selecione um cartão.'); return; }
      const fdd = firstDueDate || defaultFirstDueDate();
      if (fdd < date) { showToast('O primeiro vencimento não pode ser anterior à compra.'); return; }
      const entries = buildInstallments({
        account: card,
        category: effectiveCat.name,
        icon: effectiveCat.icon,
        note,
        total: amount,
        date,
        installments,
        firstDueDate: fdd,
        borrowedTo: borrowedTo.trim(),
      });
      dispatch({ type: 'ADD_TRANSACTIONS', payload: entries });
      dispatch({ type: 'SET_MONTH', payload: currentMonth() });
    } else {
      dispatch({
        type: 'ADD_TRANSACTION',
        payload: {
          id: makeId(),
          type,
          amount,
          date,
          note,
          category: effectiveCat.name,
          icon: effectiveCat.icon,
          accountId: defaultAccountId,
        },
      });
      if (repeat) {
        dispatch({
          type: 'ADD_RECURRING',
          payload: {
            id: makeId(),
            type,
            category: effectiveCat.name,
            icon: effectiveCat.icon,
            accountId: defaultAccountId,
            amount,
            day: Number(date.slice(8, 10)),
            note,
            startMonth: monthOf(date),
            lastGenerated: monthOf(date),
            active: true,
          },
        });
      }
      dispatch({ type: 'SET_MONTH', payload: monthOf(date) });
    }

    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    router.back();
    showToast(
      payment === 'credit' && type === 'expense' && installments > 1
        ? `${installments} parcelas adicionadas`
        : 'Lançamento salvo com sucesso'
    );
  };

  const isCreditPay = type === 'expense' && payment === 'credit' && hasCards;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: colors?.card }]}>
        <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + 8 }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={colors?.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors?.text }]}>Novo lançamento</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Type switch */}
          <View style={[styles.typeSwitch, { backgroundColor: colors?.borderLight }]}>
            <Pressable
              style={[styles.typeSwitchBtn, type === 'expense' && { backgroundColor: colors?.card }]}
              onPress={() => setType('expense')}
            >
              <Text style={[styles.typeSwitchText, type === 'expense' && { color: colors?.expense, fontWeight: '700' }]}>Despesa</Text>
            </Pressable>
            <Pressable
              style={[styles.typeSwitchBtn, type === 'income' && { backgroundColor: colors?.card }]}
              onPress={() => setType('income')}
            >
              <Text style={[styles.typeSwitchText, type === 'income' && { color: colors?.income, fontWeight: '700' }]}>Receita</Text>
            </Pressable>
          </View>

          {/* Category */}
          <Text style={[styles.label, { color: colors?.muted }]}>Categoria</Text>
          <TextInput
            style={[styles.searchInput, { borderColor: colors?.border, color: colors?.text, backgroundColor: colors?.card }]}
            placeholder="Buscar categoria"
            placeholderTextColor={colors?.mutedLight}
            value={catSearch}
            onChangeText={setCatSearch}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
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

          {/* Amount */}
          <TextInput
            style={[styles.amountInput, { color: colors?.text }]}
            value={amountDisplay}
            placeholder="R$ 0,00"
            placeholderTextColor={colors?.border}
            keyboardType="numeric"
            onChangeText={(text) => {
              const digits = text.replace(/\D/g, '');
              setAmountDigits(digits);
            }}
          />

          {/* Payment method */}
          {type === 'expense' && hasCards ? (
            <>
              <Text style={[styles.label, { color: colors?.muted }]}>Forma de pagamento</Text>
              <View style={[styles.typeSwitch, { backgroundColor: colors?.borderLight }]}>
                <Pressable
                  style={[styles.typeSwitchBtn, payment === 'account' && { backgroundColor: colors?.card }]}
                  onPress={() => setPayment('account')}
                >
                  <Text style={[styles.typeSwitchText, payment === 'account' && { color: palette?.primaryDark, fontWeight: '700' }]}>Conta</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeSwitchBtn, payment === 'credit' && { backgroundColor: colors?.card }]}
                  onPress={() => setPayment('credit')}
                >
                  <Text style={[styles.typeSwitchText, payment === 'credit' && { color: palette?.primaryDark, fontWeight: '700' }]}>Crédito</Text>
                </Pressable>
              </View>
            </>
          ) : null}

          {/* Credit fields */}
          {isCreditPay ? (
            <View style={styles.creditSection}>
              <Text style={[styles.label, { color: colors?.muted }]}>Cartão</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {cards.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.catChip,
                      { borderColor: colors?.border },
                      cardId === c.id && { borderColor: palette?.primary, backgroundColor: theme?.isDark ? '#1e3a5f' : '#eff6ff' },
                    ]}
                    onPress={() => {
                      setCardId(c.id);
                      setFirstDueDate(defaultFirstDueDate(c.id));
                    }}
                  >
                    <Text style={[styles.catChipText, cardId === c.id && { color: palette?.primaryDark }]}>
                      {c.icon} {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: colors?.muted, marginTop: 12 }]}>Parcelas</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                  <Pressable
                    key={n}
                    style={[
                      styles.catChip,
                      { borderColor: colors?.border, minWidth: 44 },
                      installments === n && { borderColor: palette?.primary, backgroundColor: theme?.isDark ? '#1e3a5f' : '#eff6ff' },
                    ]}
                    onPress={() => setInstallments(n)}
                  >
                    <Text style={[styles.catChipText, installments === n && { color: palette?.primaryDark }]}>{n}x</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[styles.label, { color: colors?.muted, marginTop: 12 }]}>Data do primeiro vencimento</Text>
              <TextInput
                style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
                value={firstDueDate}
                onChangeText={setFirstDueDate}
                placeholder="AAAA-MM-DD"
                placeholderTextColor={colors?.mutedLight}
              />

              <Text style={[styles.label, { color: colors?.muted, marginTop: 12 }]}>Emprestado para (opcional)</Text>
              <TextInput
                style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
                value={borrowedTo}
                onChangeText={setBorrowedTo}
                placeholder="Ex.: minha irmã"
                placeholderTextColor={colors?.mutedLight}
                maxLength={80}
              />
            </View>
          ) : null}

          {/* Repeat monthly */}
          {!isCreditPay ? (
            <View style={styles.repeatRow}>
              <Text style={[styles.repeatLabel, { color: colors?.text }]}>Repetir todo mês</Text>
              <Switch value={repeat} onValueChange={setRepeat} trackColor={{ true: palette?.primary }} />
            </View>
          ) : null}

          {/* Description */}
          <Text style={[styles.label, { color: colors?.muted, marginTop: 12 }]}>Descrição</Text>
          <TextInput
            style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
            value={note}
            onChangeText={setNote}
            placeholder="Ex.: almoço com amigos"
            placeholderTextColor={colors?.mutedLight}
          />

          {/* Date */}
          <Text style={[styles.label, { color: colors?.muted, marginTop: 12 }]}>Data</Text>
          <TextInput
            style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
            value={date}
            onChangeText={setDate}
            placeholder="AAAA-MM-DD"
            placeholderTextColor={colors?.mutedLight}
          />

          {/* Save button */}
          <Pressable style={[styles.saveBtn, { backgroundColor: palette?.primary }]} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Salvar lançamento</Text>
          </Pressable>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  typeSwitch: { flexDirection: 'row', padding: 4, borderRadius: 14, gap: 4, marginBottom: 16 },
  typeSwitchBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeSwitchText: { fontSize: 13, fontWeight: '600', color: '#94a3b8' },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2 },
  searchInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, marginBottom: 8 },
  catScroll: { marginBottom: 16 },
  catChip: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8 },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  amountInput: { fontSize: 32, fontWeight: '800', textAlign: 'center', paddingVertical: 20, letterSpacing: -1 },
  creditSection: { marginBottom: 16 },
  repeatRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  repeatLabel: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, marginBottom: 4 },
  saveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
