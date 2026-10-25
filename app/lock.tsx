import React, { useState, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform, Vibration } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import { derivePinHash, sameSecret } from '../src/lib/crypto';
import * as Haptics from 'expo-haptics';

const PAD = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

export default function LockScreen() {
  const { state, setLocked, theme } = useApp();
  const insets = useSafeAreaInsets();
  const colors = theme?.colors;
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const shakeAnim = useState(() => new Animated.Value(0))[0];

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 15, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -15, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const handleKey = useCallback(async (key: string) => {
    if (checking) return;
    setError('');
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === '') return;
    const next = pin + key;
    setPin(next);

    if (next.length >= 4) {
      setChecking(true);
      try {
        const hash = await derivePinHash(next, state?.pinLock?.salt ?? '');
        if (sameSecret(hash, state?.pinLock?.hash ?? '')) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          setLocked(false);
        } else {
          setError('PIN incorreto');
          setPin('');
          shake();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
          if (Platform.OS !== 'web') Vibration.vibrate(200);
        }
      } catch {
        setError('Erro ao verificar');
        setPin('');
      } finally {
        setChecking(false);
      }
    }
  }, [pin, checking, state?.pinLock]);

  return (
    <View style={[styles.container, { backgroundColor: colors?.background, paddingTop: insets?.top ?? 0, paddingBottom: insets?.bottom ?? 0 }]}>
      <View style={styles.header}>
        <Ionicons name="lock-closed" size={40} color={theme?.palette?.primary} />
        <Text style={[styles.title, { color: colors?.text }]}>EduFinance</Text>
        <Text style={[styles.subtitle, { color: colors?.textSecondary }]}>Digite seu PIN para desbloquear</Text>
      </View>

      <Animated.View style={[styles.dots, { transform: [{ translateX: shakeAnim }] }]}>
        {[0,1,2,3,4,5,6,7].map((i) => (
          i < 8 ? (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i < pin.length ? theme?.palette?.primary : 'transparent',
                  borderColor: theme?.palette?.primary,
                  display: i < Math.max(pin.length, 4) || i < 4 ? 'flex' : 'none',
                },
              ]}
            />
          ) : null
        ))}
      </Animated.View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.pad}>
        {PAD.map((key, i) => (
          <Pressable
            key={i}
            style={[styles.padBtn, { backgroundColor: key ? colors?.card : 'transparent' }]}
            onPress={() => handleKey(key)}
            disabled={!key || checking}
            accessibilityLabel={key === '⌫' ? 'Apagar' : key}
          >
            {key === '⌫' ? (
              <Ionicons name="backspace-outline" size={24} color={colors?.text} />
            ) : (
              <Text style={[styles.padText, { color: colors?.text }]}>{key}</Text>
            )}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: '700', marginTop: 12 },
  subtitle: { fontSize: 13, marginTop: 4 },
  dots: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  error: { color: '#f43f5e', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  pad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    width: 260,
    gap: 12,
    marginTop: 16,
  },
  padBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  padText: { fontSize: 26, fontWeight: '600' },
});
