import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/store/AppContext';
import Header from '../src/components/Header';
import { fontScaleOptions, fontScaleLabels } from '../src/lib/finance';
import * as Haptics from 'expo-haptics';

export default function FontSizeScreen() {
  const { state, dispatch, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = theme?.colors;

  const current = state?.fontScale ?? 1;

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Tamanho da fonte" onBack={() => router.back()} />
      <View style={{ padding: 16, paddingBottom: 32 + (insets?.bottom ?? 0) }}>
        {/* Preview */}
        <View style={[styles.preview, { backgroundColor: colors?.card }]}>
          <Text style={[styles.previewTitle, { color: colors?.text, fontSize: 16 * current }]}>Pré-visualização</Text>
          <Text style={[styles.previewBody, { color: colors?.textSecondary, fontSize: 14 * current }]}>
            Este é um texto de exemplo para visualizar o tamanho escolhido.
          </Text>
          <Text style={[styles.previewMoney, { color: colors?.income, fontSize: 20 * current }]}>R$ 1.250,00</Text>
        </View>

        {/* Options */}
        <View style={styles.options}>
          {fontScaleOptions.map((scale, i) => {
            const active = scale === current;
            return (
              <Pressable
                key={scale}
                style={[
                  styles.optionBtn,
                  {
                    backgroundColor: active ? theme?.palette?.primary : colors?.card,
                    borderColor: active ? theme?.palette?.primary : colors?.border,
                  },
                ]}
                onPress={() => {
                  dispatch({ type: 'SET_FONT_SCALE', payload: scale });
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                }}
                accessibilityLabel={`Fonte ${fontScaleLabels[i]}`}
              >
                <Text style={[styles.optionIcon, { fontSize: 18 * scale }]}>Aa</Text>
                <Text style={[styles.optionLabel, { color: active ? '#fff' : colors?.text }]}>
                  {fontScaleLabels[i]}
                </Text>
                {active ? <Ionicons name="checkmark-circle" size={18} color="#fff" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  preview: { borderRadius: 20, padding: 20, marginBottom: 24, alignItems: 'center', gap: 8 },
  previewTitle: { fontWeight: '700' },
  previewBody: { textAlign: 'center', lineHeight: 22 },
  previewMoney: { fontWeight: '700', marginTop: 4 },
  options: { gap: 10 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 12,
    borderWidth: 1.5,
  },
  optionIcon: { fontWeight: '700', width: 44 },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
});
