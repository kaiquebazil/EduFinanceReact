import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useApp } from '../store/AppContext';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({ visible, title, message, confirmLabel = 'Confirmar', danger, onConfirm, onCancel }: Props) {
  const { theme } = useApp();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.backdrop} onPress={onCancel}>
        <Pressable style={[styles.dialog, { backgroundColor: theme?.colors?.card }]} onPress={(e) => e.stopPropagation()}>
          <Text style={[styles.title, { color: theme?.colors?.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme?.colors?.muted }]}>{message}</Text>
          <View style={styles.actions}>
            <Pressable style={[styles.btn, { borderColor: theme?.colors?.border }]} onPress={onCancel}>
              <Text style={[styles.btnText, { color: theme?.colors?.muted }]}>Cancelar</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, { backgroundColor: danger ? '#e11d48' : theme?.palette?.primary }]}
              onPress={onConfirm}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>{confirmLabel}</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 20, marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 10 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  btnText: { fontSize: 14, fontWeight: '700' },
});
