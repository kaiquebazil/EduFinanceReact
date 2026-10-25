import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useApp } from '../store/AppContext';

interface Props {
  title: string;
  subtitle?: string;
}

export default function EmptyState({ title, subtitle }: Props) {
  const { theme } = useApp();
  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme?.colors?.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme?.colors?.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  title: { fontSize: 15, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
});
