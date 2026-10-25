import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/store/AppContext';
import Header from '../../src/components/Header';
import MonthNavigator from '../../src/components/MonthNavigator';
import ProgressBar from '../../src/components/ProgressBar';
import EmptyState from '../../src/components/EmptyState';
import { money, inMonth, monthLabel, selectableCategories, budgetHeatClass, parseMoney } from '../../src/lib/finance';

export default function BudgetScreen() {
  const { state, dispatch, theme, showToast } = useApp();
  const router = useRouter();
  const colors = theme?.colors;
  const [budgetType, setBudgetType] = useState<'expense' | 'income'>('expense');

  const isIncome = budgetType === 'income';
  const budgetMap = isIncome ? state?.incomeCategoryBudgets : state?.categoryBudgets;
  const categories = state?.categories?.[budgetType] ?? [];

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (inMonth(state) ?? []).filter((x) => x?.type === budgetType).forEach((x) => {
      map[x?.category ?? ''] = (map[x?.category ?? ''] ?? 0) + Number(x?.amount ?? 0);
    });
    return map;
  }, [state, budgetType]);

  const goals = useMemo(() => {
    return Object.entries(budgetMap ?? {})
      .map(([name, amount]) => {
        const category = categories.find((c) => c.name === name);
        const spent = byCategory[name] ?? 0;
        const progress = amount > 0 ? (spent / amount) * 100 : 0;
        return category && amount >= 0 ? { category, amount, spent, progress } : null;
      })
      .filter(Boolean)
      .sort((a, b) => (b?.progress ?? 0) - (a?.progress ?? 0)) as { category: { name: string; icon: string }; amount: number; spent: number; progress: number }[];
  }, [budgetMap, categories, byCategory]);

  const monthlyBudget = goals.reduce((s, g) => s + g.amount, 0);
  const actual = Object.values(byCategory).reduce((s, a) => s + a, 0);
  const actualUsed = monthlyBudget ? (actual / monthlyBudget) * 100 : 0;
  const actualLabel = isIncome ? 'recebido' : 'utilizado';

  return (
    <View style={[styles.container, { backgroundColor: colors?.background }]}>
      <Header
        title={monthLabel(state?.selectedMonth ?? '')}
        subtitle={isIncome ? 'Meta de receitas' : 'Orçamento de despesas'}
        value={state?.hideAmounts ? 'R$ ••••' : money(monthlyBudget)}
      />
      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 120 }}>
        <MonthNavigator />
        <View style={[styles.typeSwitch, { backgroundColor: colors?.borderLight }]}>
          <Pressable
            style={[styles.typeSwitchBtn, !isIncome && [styles.typeSwitchActive, { backgroundColor: colors?.card }]]}
            onPress={() => setBudgetType('expense')}
          >
            <Text style={[styles.typeSwitchText, !isIncome && { color: theme?.palette?.primaryDark, fontWeight: '700' }]}>Despesas</Text>
          </Pressable>
          <Pressable
            style={[styles.typeSwitchBtn, isIncome && [styles.typeSwitchActive, { backgroundColor: colors?.card }]]}
            onPress={() => setBudgetType('income')}
          >
            <Text style={[styles.typeSwitchText, isIncome && { color: theme?.palette?.primaryDark, fontWeight: '700' }]}>Receitas</Text>
          </Pressable>
        </View>

        <View style={[styles.panel, { backgroundColor: colors?.card, borderColor: colors?.borderLight }]}>
          <View style={styles.panelRow}>
            <Text style={[styles.panelLabel, { color: colors?.text }]}>{isIncome ? 'Receitas' : 'Despesas'} de {monthLabel(state?.selectedMonth ?? '')}</Text>
            <Text style={{ color: colors?.muted }}>{Math.round(actualUsed)}%</Text>
          </View>
          <ProgressBar percent={actualUsed} heatClass={isIncome ? undefined : budgetHeatClass(actualUsed)} isIncome={isIncome} />
          <View style={styles.panelRow}>
            <Text style={{ color: colors?.muted, fontSize: 12 }}>{money(actual)} {actualLabel}</Text>
            <Text style={{ color: colors?.muted, fontSize: 12 }}>{money(Math.max(monthlyBudget - actual, 0))} {isIncome ? 'para atingir a meta' : 'restante'}</Text>
          </View>
        </View>

        <View style={styles.goalsHeading}>
          <Text style={[styles.sectionTitle, { color: colors?.text }]}>Metas por categoria</Text>
          <Text style={{ color: colors?.muted, fontSize: 12, fontWeight: '700' }}>{goals?.length ?? 0} {goals?.length === 1 ? 'meta' : 'metas'}</Text>
        </View>

        {(goals?.length ?? 0) > 0 ? (
          <View style={[styles.list, { backgroundColor: colors?.card, borderColor: colors?.borderLight }]}>
            {goals.map((g) => (
              <Pressable
                key={g.category.name}
                style={[styles.goalRow, { borderBottomColor: colors?.borderLight }]}
                onPress={() => router.push(`/category-detail?name=${encodeURIComponent(g.category.name)}&type=${budgetType}&filter=month`)}
              >
                <View style={[styles.goalIcon, { backgroundColor: theme?.isDark ? '#273449' : '#eff6ff' }]}>
                  <Text style={{ fontSize: 16 }}>{g.category.icon}</Text>
                </View>
                <View style={styles.goalInfo}>
                  <Text style={[styles.goalName, { color: colors?.text }]}>{g.category.name}</Text>
                  <Text style={{ color: colors?.muted, fontSize: 11 }}>
                    {money(g.spent)} {actualLabel} de {money(g.amount)} · {Math.round(g.progress)}%
                  </Text>
                  <ProgressBar percent={g.progress} heatClass={isIncome ? undefined : budgetHeatClass(g.progress)} isIncome={isIncome} height={6} />
                </View>
              </Pressable>
            ))}
          </View>
        ) : (
          <EmptyState title="Nenhuma meta por categoria definida." />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  typeSwitch: { flexDirection: 'row', padding: 5, borderRadius: 14, marginVertical: 16, gap: 5 },
  typeSwitchBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  typeSwitchActive: {},
  typeSwitchText: { fontSize: 14, fontWeight: '600', color: '#94a3b8' },
  panel: { borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 16 },
  panelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelLabel: { fontSize: 14, fontWeight: '700' },
  goalsHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  list: { borderRadius: 18, overflow: 'hidden', borderWidth: 1 },
  goalRow: { flexDirection: 'row', padding: 14, gap: 12, borderBottomWidth: 1, alignItems: 'center' },
  goalIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  goalInfo: { flex: 1, gap: 4 },
  goalName: { fontSize: 13, fontWeight: '700' },
});
