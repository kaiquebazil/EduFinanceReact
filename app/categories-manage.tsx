import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet, Modal, FlatList, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import { categoryDescriptions } from '../src/lib/finance';
import * as Haptics from 'expo-haptics';
import type { Category } from '../src/lib/types';

const emojiSuggestions = ['🍽️','🚕','🏠','💊','🎓','🎉','👕','🐾','💇','🎁','💰','💼','🔄','✈️','🍔','💸','🩺','🅿️','👜','🤝','🤲','👨‍👩‍👧','📱','🏋️','🎮','☕','🎵','📚','🛒','⚽'];

export default function CategoriesManageScreen() {
  const { state, dispatch, theme, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [showModal, setShowModal] = useState(false);
  const [editingIdx, setEditingIdx] = useState(-1);
  const [catName, setCatName] = useState('');
  const [catIcon, setCatIcon] = useState('💰');
  const [catHidden, setCatHidden] = useState(false);

  const list = useMemo(() => state?.categories?.[type] ?? [], [state?.categories, type]);

  const openNew = () => {
    setEditingIdx(-1);
    setCatName('');
    setCatIcon('💰');
    setCatHidden(false);
    setShowModal(true);
  };

  const openEdit = (idx: number) => {
    const c = list[idx];
    if (!c) return;
    setEditingIdx(idx);
    setCatName(c.name);
    setCatIcon(c.icon);
    setCatHidden(Boolean(c.hidden));
    setShowModal(true);
  };

  const save = () => {
    const name = catName.trim();
    if (!name) return;
    const cats = [...list];
    if (editingIdx >= 0) {
      cats[editingIdx] = { ...cats[editingIdx], name, icon: catIcon, hidden: catHidden };
    } else {
      if (cats.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        showToast('Categoria já existe');
        return;
      }
      cats.push({ name, icon: catIcon, hidden: catHidden });
    }
    cats.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
    const otherType = type === 'expense' ? 'income' : 'expense';
    dispatch({
      type: 'SET_CATEGORIES',
      payload: { [type]: cats, [otherType]: state?.categories?.[otherType] ?? [] } as any,
    });
    setShowModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    showToast(editingIdx >= 0 ? 'Categoria atualizada' : 'Categoria adicionada');
  };

  const toggleVisibility = (idx: number) => {
    const cats = [...list];
    cats[idx] = { ...cats[idx], hidden: !cats[idx]?.hidden };
    const otherType = type === 'expense' ? 'income' : 'expense';
    dispatch({
      type: 'SET_CATEGORIES',
      payload: { [type]: cats, [otherType]: state?.categories?.[otherType] ?? [] } as any,
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Categorias" onBack={() => router.back()} />

      {/* Type toggle */}
      <View style={[styles.toggle, { backgroundColor: colors?.card }]}>
        {(['expense', 'income'] as const).map((t) => (
          <Pressable
            key={t}
            style={[styles.toggleBtn, type === t && { backgroundColor: theme?.palette?.primary }]}
            onPress={() => setType(t)}
          >
            <Text style={[styles.toggleText, { color: type === t ? '#fff' : colors?.textSecondary }]}>
              {t === 'expense' ? 'Despesas' : 'Receitas'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={list}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + (insets?.bottom ?? 0) }}
        renderItem={({ item, index }) => (
          <Pressable
            style={[styles.catRow, { backgroundColor: colors?.card }]}
            onPress={() => openEdit(index)}
            accessibilityLabel={`Editar ${item?.name}`}
          >
            <Text style={styles.catIcon}>{item?.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.catName, { color: item?.hidden ? colors?.muted : colors?.text }]}>
                {item?.name}
              </Text>
              {categoryDescriptions[item?.name ?? ''] ? (
                <Text style={[styles.catDesc, { color: colors?.textSecondary }]} numberOfLines={1}>
                  {categoryDescriptions[item.name]}
                </Text>
              ) : null}
            </View>
            <Pressable onPress={() => toggleVisibility(index)} hitSlop={12}>
              <Ionicons
                name={item?.hidden ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={item?.hidden ? colors?.muted : colors?.textSecondary}
              />
            </Pressable>
          </Pressable>
        )}
      />

      {/* FAB add */}
      <Pressable
        style={[styles.fab, { backgroundColor: theme?.palette?.primary, bottom: 24 + (insets?.bottom ?? 0) }]}
        onPress={openNew}
        accessibilityLabel="Adicionar categoria"
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      {/* Edit / Add modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setShowModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors?.card }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors?.text }]}>
              {editingIdx >= 0 ? 'Editar categoria' : 'Nova categoria'}
            </Text>

            <Text style={[styles.label, { color: colors?.textSecondary }]}>Nome</Text>
            <TextInput
              style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
              value={catName}
              onChangeText={setCatName}
              placeholder="Nome da categoria"
              placeholderTextColor={colors?.muted}
              maxLength={40}
            />

            <Text style={[styles.label, { color: colors?.textSecondary }]}>Ícone</Text>
            <View style={styles.emojiGrid}>
              {emojiSuggestions.map((e) => (
                <Pressable
                  key={e}
                  style={[styles.emojiBtn, catIcon === e && { backgroundColor: theme?.palette?.primary + '30', borderColor: theme?.palette?.primary }]}
                  onPress={() => setCatIcon(e)}
                >
                  <Text style={{ fontSize: 22 }}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <View style={[styles.row, { marginTop: 12 }]}>
              <Text style={[styles.label, { color: colors?.textSecondary, flex: 1, marginBottom: 0 }]}>Oculta</Text>
              <Switch
                value={catHidden}
                onValueChange={setCatHidden}
                trackColor={{ false: colors?.border, true: theme?.palette?.primary }}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowModal(false)} style={styles.modalBtn}>
                <Text style={[styles.modalBtnText, { color: colors?.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={save} style={[styles.modalBtn, { backgroundColor: theme?.palette?.primary, borderRadius: 12 }]}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>Salvar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toggle: { flexDirection: 'row', marginHorizontal: 16, borderRadius: 12, padding: 3, marginBottom: 8 },
  toggleBtn: { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  toggleText: { fontSize: 13, fontWeight: '700' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, padding: 14, marginBottom: 8 },
  catIcon: { fontSize: 24 },
  catName: { fontSize: 14, fontWeight: '600' },
  catDesc: { fontSize: 11, marginTop: 2 },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 12 },
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  emojiBtn: { width: 42, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  row: { flexDirection: 'row', alignItems: 'center' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 16 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});
