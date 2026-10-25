import React from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../store/AppContext';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  title: string;
  subtitle?: string;
  value?: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

export default function Header({ title, subtitle, value, onBack, rightAction }: HeaderProps) {
  const { theme } = useApp();
  const insets = useSafeAreaInsets();
  const palette = theme?.palette;

  return (
    <View style={[styles.container, { backgroundColor: palette?.primary ?? '#3b82f6', paddingTop: (insets?.top ?? 0) + 12 }]}>
      <View style={styles.topBar}>
        {onBack ? (
          <Pressable style={styles.iconBtn} onPress={onBack} accessibilityLabel="Voltar">
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        ) : <View style={styles.iconBtn} />}
        <Text style={styles.period} numberOfLines={1}>{title}</Text>
        {rightAction ?? <View style={styles.iconBtn} />}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {value ? <Text style={styles.value}>{value}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  period: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    opacity: 0.9,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 20,
  },
  value: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    marginTop: 4,
  },
});
