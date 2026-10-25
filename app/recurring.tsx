import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import EmptyState from '../src/components/EmptyState';
import { money, accountName } from '../src/lib/finance';
import * as Haptics from 'expo-haptics';

export default function RecurringScreen() {
  const { state, dispatch, theme, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const items = state?.recurring ?? [];

  const handleRemove = (id: string, label: string) => {
    const rec = items.find((r) => r.id === id);
    const doRemove = () => {
      dispatch({ type: 'REMOVE_RECURRING', payload: id });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      showToast(`"${label}" removido`, rec ? () => dispatch({ type: 'ADD_RECURRING', payload: rec }) : null);
    };
    if (Platform.OS === 'web') {
      if (confirm(`Remover recorrente "${label}"?`)) doRemove();
    } else {
      Alert.alert('Remover', `Remover transação recorrente "${label}"?`, [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Remover', style: 'destructive', onPress: doRemove },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Recorrentes" subtitle={`${items?.length ?? 0} transação(ões)`} onBack={() => router.back()} />
      {(items?.length ?? 0) === 0 ? (
        <EmptyState title="Sem recorrentes" subtitle="Transações recorrentes aparecerão aqui" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item?.id ?? ''}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors?.card }]}>
              <View style={styles.row}>
                <Text style={styles.emoji}>{item?.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: colors?.text }]}>{item?.category}</Text>
                  <Text style={[styles.sub, { color: colors?.textSecondary }]}>
                    {item?.type === 'income' ? 'Receita' : 'Despesa'} · Dia {item?.day} · {accountName(state, item?.accountId)}
                  </Text>
                  {item?.note ? <Text style={[styles.note, { color: colors?.muted }]}>{item.note}</Text> : null}
                </View>
                <Text style={[styles.amount, { color: item?.type === 'income' ? colors?.income : colors?.expense }]}>
                  {money(item?.amount)}
                </Text>
                <Pressable
                  onPress={() => handleRemove(item?.id, item?.category)}
                  hitSlop={12}
                  accessibilityLabel={`Remover ${item?.category}`}
                >
                  <Ionicons name="trash-outline" size={20} color={colors?.expense} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 16, padding: 14, marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 26 },
  name: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 11, marginTop: 2 },
  note: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  amount: { fontSize: 14, fontWeight: '700' },
});
