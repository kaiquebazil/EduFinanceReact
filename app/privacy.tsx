import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Switch, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import { derivePinHash, generateSalt, sameSecret } from '../src/lib/crypto';
import * as Haptics from 'expo-haptics';

export default function PrivacyScreen() {
  const { state, dispatch, theme, isLocked, setLocked, showToast } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const pinEnabled = Boolean(state?.pinLock?.enabled);
  const [showPinModal, setShowPinModal] = useState(false);
  const [modalMode, setModalMode] = useState<'set' | 'disable' | 'change'>('set');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const openSetPin = () => {
    setModalMode(pinEnabled ? 'change' : 'set');
    setPin1(''); setPin2(''); setOldPin(''); setError('');
    setShowPinModal(true);
  };

  const openDisablePin = () => {
    setModalMode('disable');
    setPin1(''); setPin2(''); setOldPin(''); setError('');
    setShowPinModal(true);
  };

  const handleSavePin = async () => {
    if (loading) return;
    setError('');

    if (modalMode === 'disable') {
      if (!oldPin || oldPin.length < 4) { setError('Digite o PIN atual'); return; }
      setLoading(true);
      try {
        const hash = await derivePinHash(oldPin, state?.pinLock?.salt ?? '');
        if (!sameSecret(hash, state?.pinLock?.hash ?? '')) {
          setError('PIN incorreto');
          setLoading(false);
          return;
        }
        dispatch({ type: 'SET_PIN', payload: null });
        setShowPinModal(false);
        showToast('PIN desativado');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } catch {
        setError('Erro ao verificar PIN');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (modalMode === 'change' && (!oldPin || oldPin.length < 4)) {
      setError('Digite o PIN atual');
      return;
    }
    if (!pin1 || pin1.length < 4) { setError('PIN precisa ter pelo menos 4 dígitos'); return; }
    if (pin1 !== pin2) { setError('PINs não conferem'); return; }

    setLoading(true);
    try {
      if (modalMode === 'change') {
        const oldHash = await derivePinHash(oldPin, state?.pinLock?.salt ?? '');
        if (!sameSecret(oldHash, state?.pinLock?.hash ?? '')) {
          setError('PIN atual incorreto');
          setLoading(false);
          return;
        }
      }
      const salt = generateSalt();
      const hash = await derivePinHash(pin1, salt);
      dispatch({ type: 'SET_PIN', payload: { salt, hash } });
      setShowPinModal(false);
      showToast(modalMode === 'change' ? 'PIN alterado' : 'PIN ativado');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch {
      setError('Erro ao salvar PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Privacidade" onBack={() => router.back()} />
      <View style={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}>
        {/* Hide amounts */}
        <View style={[styles.card, { backgroundColor: colors?.card }]}>
          <View style={styles.row}>
            <Ionicons name="eye-off-outline" size={22} color={theme?.palette?.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors?.text }]}>Ocultar valores</Text>
              <Text style={[styles.itemSub, { color: colors?.textSecondary }]}>Esconde todos os valores monetários</Text>
            </View>
            <Switch
              value={state?.hideAmounts ?? false}
              onValueChange={() => dispatch({ type: 'TOGGLE_HIDE_AMOUNTS' })}
              trackColor={{ false: colors?.border, true: theme?.palette?.primary }}
            />
          </View>
        </View>

        {/* PIN lock */}
        <View style={[styles.card, { backgroundColor: colors?.card }]}>
          <View style={styles.row}>
            <Ionicons name="lock-closed-outline" size={22} color={theme?.palette?.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemTitle, { color: colors?.text }]}>Bloqueio por PIN</Text>
              <Text style={[styles.itemSub, { color: colors?.textSecondary }]}>
                {pinEnabled ? 'Ativado — tela de bloqueio ao sair do app' : 'Desativado'}
              </Text>
            </View>
          </View>
          <View style={styles.btnRow}>
            {pinEnabled ? (
              <>
                <Pressable style={[styles.btn, { borderColor: theme?.palette?.primary }]} onPress={openSetPin}>
                  <Text style={[styles.btnText, { color: theme?.palette?.primary }]}>Alterar PIN</Text>
                </Pressable>
                <Pressable style={[styles.btn, { borderColor: colors?.expense }]} onPress={openDisablePin}>
                  <Text style={[styles.btnText, { color: colors?.expense }]}>Desativar</Text>
                </Pressable>
              </>
            ) : (
              <Pressable style={[styles.btn, { borderColor: theme?.palette?.primary }]} onPress={openSetPin}>
                <Text style={[styles.btnText, { color: theme?.palette?.primary }]}>Ativar PIN</Text>
              </Pressable>
            )}
          </View>
        </View>

        {pinEnabled ? (
          <Pressable
            style={[styles.lockNow, { backgroundColor: theme?.palette?.primary }]}
            onPress={() => {
              setLocked(true);
              router.replace('/');
            }}
          >
            <Ionicons name="lock-closed" size={18} color="#fff" />
            <Text style={styles.lockNowText}>Bloquear agora</Text>
          </Pressable>
        ) : null}
      </View>

      {/* PIN modal */}
      <Modal visible={showPinModal} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setShowPinModal(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={[styles.modalContent, { backgroundColor: colors?.card }]} onPress={() => {}}>
              <Text style={[styles.modalTitle, { color: colors?.text }]}>
                {modalMode === 'set' ? 'Criar PIN' : modalMode === 'change' ? 'Alterar PIN' : 'Desativar PIN'}
              </Text>

              {(modalMode === 'change' || modalMode === 'disable') ? (
                <>
                  <Text style={[styles.label, { color: colors?.textSecondary }]}>PIN atual</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
                    value={oldPin}
                    onChangeText={setOldPin}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={8}
                    placeholder="••••"
                    placeholderTextColor={colors?.muted}
                  />
                </>
              ) : null}

              {modalMode !== 'disable' ? (
                <>
                  <Text style={[styles.label, { color: colors?.textSecondary }]}>Novo PIN (mínimo 4 dígitos)</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
                    value={pin1}
                    onChangeText={setPin1}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={8}
                    placeholder="••••"
                    placeholderTextColor={colors?.muted}
                  />
                  <Text style={[styles.label, { color: colors?.textSecondary }]}>Confirmar PIN</Text>
                  <TextInput
                    style={[styles.input, { borderColor: colors?.border, color: colors?.text }]}
                    value={pin2}
                    onChangeText={setPin2}
                    secureTextEntry
                    keyboardType="number-pad"
                    maxLength={8}
                    placeholder="••••"
                    placeholderTextColor={colors?.muted}
                  />
                </>
              ) : null}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <View style={styles.modalActions}>
                <Pressable onPress={() => setShowPinModal(false)} style={styles.modalBtn}>
                  <Text style={[styles.modalBtnText, { color: colors?.textSecondary }]}>Cancelar</Text>
                </Pressable>
                <Pressable onPress={handleSavePin} style={[styles.modalBtn, { backgroundColor: theme?.palette?.primary, borderRadius: 12 }]}>
                  <Text style={[styles.modalBtnText, { color: '#fff' }]}>
                    {loading ? 'Aguarde...' : modalMode === 'disable' ? 'Desativar' : 'Salvar'}
                  </Text>
                </Pressable>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  itemSub: { fontSize: 11, marginTop: 2 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btn: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8 },
  btnText: { fontSize: 12, fontWeight: '700' },
  lockNow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  lockNowText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 24, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13, fontSize: 18, letterSpacing: 8, marginBottom: 12, textAlign: 'center' },
  error: { color: '#f43f5e', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12 },
  modalBtnText: { fontSize: 14, fontWeight: '700' },
});
