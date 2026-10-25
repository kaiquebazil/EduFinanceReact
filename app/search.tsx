import React, { useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import { accountName } from '../src/lib/finance';
import TransactionRow from '../src/components/TransactionRow';
import EmptyState from '../src/components/EmptyState';

export default function SearchScreen() {
  const { state, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return (state?.transactions ?? [])
      .filter((t) => {
        const hay = `${t?.category ?? ''} ${t?.note ?? ''} ${t?.amount ?? ''} ${accountName(state, t?.accountId)}`.toLowerCase();
        return hay.includes(q);
      })
      .sort((a, b) => (b?.date ?? '').localeCompare(a?.date ?? ''));
  }, [query, state]);

  return (
    <View style={[styles.container, { backgroundColor: colors?.card }]}>
      <View style={[styles.header, { paddingTop: (insets?.top ?? 0) + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.closeBtn}>
          <Ionicons name="close" size={24} color={colors?.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors?.text }]}>Buscar lançamentos</Text>
        <View style={{ width: 36 }} />
      </View>
      <TextInput
        style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
        placeholder="Descrição, categoria, valor..."
        placeholderTextColor={colors?.mutedLight}
        value={query}
        onChangeText={setQuery}
        autoFocus
      />
      {query.trim() ? (
        <Text style={[styles.count, { color: colors?.muted }]}>{results?.length ?? 0} resultado(s)</Text>
      ) : null}
      <FlatList
        data={results ?? []}
        keyExtractor={(item) => item?.id ?? ''}
        renderItem={({ item }) => (
          <TransactionRow tx={item} onPress={() => { router.back(); setTimeout(() => router.push(`/edit-transaction?id=${item?.id}`), 100); }} />
        )}
        ListEmptyComponent={query.trim() ? <EmptyState title="Nada encontrado." /> : <EmptyState title="Digite para buscar..." />}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', textAlign: 'center' },
  input: { marginHorizontal: 16, borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  count: { marginHorizontal: 16, marginTop: 12, fontSize: 13 },
});
