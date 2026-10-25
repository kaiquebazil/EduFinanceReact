import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import Header from '../../src/components/Header';
import ConfirmDialog from '../../src/components/ConfirmDialog';
import { isCredit, themeOptions, fontScaleLabels, seedState, money } from '../../src/lib/finance';
import { saveState } from '../../src/lib/storage';
import * as Haptics from 'expo-haptics';

export default function SettingsScreen() {
  const { state, dispatch, theme, showToast } = useApp();
  const router = useRouter();
  const colors = theme?.colors;
  const [showClear, setShowClear] = React.useState(false);

  const cards = (state?.accounts ?? []).filter(isCredit);
  const recCount = (state?.recurring ?? []).length;

  const handleClear = () => {
    setShowClear(false);
    const backup = JSON.parse(JSON.stringify(state));
    dispatch({ type: 'CLEAR_ALL' });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    showToast('Todos os dados foram apagados', () => {
      dispatch({ type: 'SET_STATE', payload: backup });
      showToast('Dados restaurados');
    });
  };

  const handleExport = async () => {
    try {
      const backup = { ...state };
      const data = JSON.stringify(backup, null, 2);
      if (Platform.OS === 'web') {
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `meu-controle-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const FileSystem = require('expo-file-system');
        const Sharing = require('expo-sharing');
        const { Paths, File } = FileSystem;
        const file = new File(Paths.cache, `meu-controle-${new Date().toISOString().slice(0, 10)}.json`);
        await file.write(data);
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
        }
      }
      showToast('Backup exportado');
    } catch (e) {
      showToast('Erro ao exportar');
    }
  };

  const handleImport = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = (e: any) => {
          const file = e?.target?.files?.[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = (ev: any) => {
            try {
              const data = JSON.parse(ev?.target?.result);
              if (!data?.transactions || !data?.accounts) throw new Error('Formato inválido');
              const { migrate } = require('../../src/lib/finance');
              const imported = migrate(data);
              const localPrivacy = { pinLock: state?.pinLock, hideAmounts: state?.hideAmounts };
              dispatch({ type: 'IMPORT_STATE', payload: { ...imported, ...localPrivacy } });
              showToast('Dados importados');
            } catch {
              showToast('Arquivo inválido');
            }
          };
          reader.readAsText(file);
        };
        input.click();
      } else {
        const DocumentPicker = require('expo-document-picker');
        const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
        if (result?.canceled) return;
        const uri = result?.assets?.[0]?.uri;
        if (!uri) return;
        const FileSystem = require('expo-file-system');
        const { File: FSFile } = FileSystem;
        // Read file content
        const response = await fetch(uri);
        const text = await response.text();
        const data = JSON.parse(text);
        if (!data?.transactions || !data?.accounts) throw new Error('Formato inválido');
        const { migrate } = require('../../src/lib/finance');
        const imported = migrate(data);
        const localPrivacy = { pinLock: state?.pinLock, hideAmounts: state?.hideAmounts };
        dispatch({ type: 'IMPORT_STATE', payload: { ...imported, ...localPrivacy } });
        showToast('Dados importados');
      }
    } catch {
      showToast('Arquivo inválido');
    }
  };

  const settingItem = (icon: string, title: string, subtitle: string, onPress: () => void) => (
    <Pressable style={[styles.setting, { borderBottomColor: colors?.borderLight }]} onPress={onPress}>
      <View style={[styles.settingIcon, { backgroundColor: theme?.isDark ? '#172033' : '#eff6ff' }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <View style={styles.settingInfo}>
        <Text style={[styles.settingTitle, { color: colors?.text }]}>{title}</Text>
        <Text style={[styles.settingSub, { color: colors?.muted }]}>{subtitle}</Text>
      </View>
      <Text style={{ color: colors?.mutedLight, fontSize: 18 }}>›</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header title="Meu Controle" subtitle="Organize sua vida financeira" value="Configurações" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        <View style={[styles.list, { backgroundColor: colors?.card, borderColor: colors?.borderLight, marginTop: 18, marginHorizontal: 18 }]}>
          {settingItem('💳', 'Cartões de crédito', `${cards?.length ?? 0} cadastrado(s)`, () => router.push('/credit-cards'))}
          {settingItem('💰', 'Saldo na tela inicial', state?.homeBalanceMode === 'remaining' ? 'Saldo que sobrou até agora' : 'Saldo do mês', () => router.push('/balance-display'))}
          {settingItem('▦', 'Categorias', 'Receitas e despesas', () => router.push('/categories-manage'))}
          {settingItem('🎨', 'Temas', `${themeOptions.find((t) => t.id === state?.theme)?.label ?? 'Padrão'}`, () => router.push('/themes'))}
          {settingItem('Aa', 'Tamanho da fonte', fontScaleLabels[state?.fontScale ?? 1] ?? 'Padrão', () => router.push('/font-size'))}
          {settingItem('🔒', 'Privacidade e bloqueio', state?.pinLock?.enabled ? 'PIN ativado' : 'Ocultar valores e configurar PIN', () => router.push('/privacy'))}
          {settingItem('💳', 'Compras parceladas', 'Parcelas em aberto', () => router.push('/installments'))}
          {settingItem('🧾', 'Faturas do cartão', 'Pagar faturas abertas', () => router.push('/invoices'))}
          {settingItem('🔁', 'Lançamentos recorrentes', `${recCount} ativo(s)`, () => router.push('/recurring'))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors?.text, marginTop: 24, marginHorizontal: 18 }]}>Dados</Text>
        <View style={[styles.list, { backgroundColor: colors?.card, borderColor: colors?.borderLight, marginHorizontal: 18 }]}>
          {settingItem('📤', 'Exportar backup', 'Baixar arquivo JSON', handleExport)}
          {settingItem('📥', 'Importar dados', 'Restaurar de um arquivo JSON', handleImport)}
          <Pressable style={[styles.setting, { borderBottomColor: colors?.borderLight }]} onPress={() => setShowClear(true)}>
            <View style={[styles.settingIcon, { backgroundColor: '#fff1f2' }]}>
              <Text style={{ fontSize: 16 }}>⚠</Text>
            </View>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: '#be123c' }]}>Apagar todos os dados</Text>
              <Text style={[styles.settingSub, { color: '#e11d48' }]}>Apaga tudo deste dispositivo</Text>
            </View>
            <Text style={{ color: colors?.mutedLight, fontSize: 18 }}>›</Text>
          </Pressable>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={showClear}
        title="Apagar TODOS os dados?"
        message="Isso remove permanentemente todos os lançamentos, contas, cartões, categorias, orçamentos e preferências deste dispositivo. Exporte um backup antes."
        confirmLabel="APAGAR TUDO"
        danger
        onConfirm={handleClear}
        onCancel={() => setShowClear(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  settingIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  settingInfo: { flex: 1, gap: 2 },
  settingTitle: { fontSize: 14, fontWeight: '700' },
  settingSub: { fontSize: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
});
