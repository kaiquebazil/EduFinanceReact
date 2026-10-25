import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/store/AppContext';
import { money, inMonth, today, startOfWeek, addMonths, currentMonth, monthLabel } from '../../src/lib/finance';
import Svg, { Circle, Path as SvgPath, G } from 'react-native-svg';

const CHART_COLORS = ['#2563eb', '#22d3ee', '#f59e0b', '#10b981', '#f43f5e', '#8b5cf6', '#64748b', '#0ea5e9'];

export default function StatsScreen() {
  const { state, dispatch, theme } = useApp();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const palette = theme?.palette;
  const colors = theme?.colors;
  const [statsType, setStatsType] = useState<'expense' | 'income'>('expense');
  const [statsFilter, setStatsFilter] = useState('month');

  const list = useMemo(() => {
    const txs = state?.transactions ?? [];
    if (statsFilter === 'day') return txs.filter((t) => t?.date === today());
    if (statsFilter === 'week') return txs.filter((t) => (t?.date ?? '') >= startOfWeek() && (t?.date ?? '') <= today());
    if (statsFilter === 'month') return inMonth(state);
    if (statsFilter === 'year') return txs.filter((t) => t?.date?.startsWith(state?.selectedMonth?.slice(0, 4) ?? ''));
    return txs;
  }, [state, statsFilter]);

  const { topCats, total } = useMemo(() => {
    const byCategory: Record<string, { icon: string; total: number; count: number }> = {};
    (list ?? []).filter((x) => x?.type === statsType).forEach((x) => {
      const cat = x?.category ?? '';
      if (!byCategory[cat]) byCategory[cat] = { icon: x?.icon ?? '', total: 0, count: 0 };
      byCategory[cat].total += Number(x?.amount ?? 0);
      byCategory[cat].count++;
    });
    const sorted = Object.entries(byCategory).sort((a, b) => b[1].total - a[1].total);
    const t = sorted.reduce((sum, [, d]) => sum + d.total, 0);
    return { topCats: sorted, total: t };
  }, [list, statsType]);

  // Donut chart segments
  const donutSegments = useMemo(() => {
    if (!total || topCats?.length === 0) return [];
    let startAngle = 0;
    return topCats.map(([, data], i) => {
      const sweep = (data.total / total) * 360;
      const seg = { start: startAngle, sweep, color: CHART_COLORS[i % CHART_COLORS.length] };
      startAngle += sweep;
      return seg;
    });
  }, [topCats, total]);

  const filterLabels: Record<string, string> = { day: 'Hoje', week: 'Semana', month: 'Mês', year: 'Ano', all: 'Tudo' };
  const recentMonths = [-3, -2, -1, 0].map((d) => addMonths(currentMonth(), d));

  return (
    <View style={[styles.container, { backgroundColor: colors?.card }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: palette?.primary, paddingTop: (insets?.top ?? 0) + 8 }]}>
        <View style={styles.topBar}>
          <Text style={styles.headerTitle}>Relatórios</Text>
          <Pressable style={styles.calendarBtn} onPress={() => router.push('/month-picker')}>
            <Ionicons name="calendar-outline" size={20} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.typeSwitch}>
          <Pressable
            style={[styles.typeSwitchBtn, statsType === 'expense' && styles.typeSwitchActive]}
            onPress={() => setStatsType('expense')}
          >
            <Text style={[styles.typeSwitchText, statsType === 'expense' && styles.typeSwitchTextActive]}>Despesas</Text>
          </Pressable>
          <Pressable
            style={[styles.typeSwitchBtn, statsType === 'income' && styles.typeSwitchActive]}
            onPress={() => setStatsType('income')}
          >
            <Text style={[styles.typeSwitchText, statsType === 'income' && styles.typeSwitchTextActive]}>Receitas</Text>
          </Pressable>
        </View>
      </View>

      {/* Period filters */}
      <View style={[styles.periodRow, { borderBottomColor: colors?.borderLight, backgroundColor: colors?.card }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.periodsScroll}>
          {recentMonths.map((m) => {
            const label = m === currentMonth() ? 'Este mês'
              : m === addMonths(currentMonth(), -1) ? 'Mês passado'
                : monthLabel(m);
            const isActive = statsFilter === 'month' && state?.selectedMonth === m;
            return (
              <Pressable
                key={m}
                style={[styles.periodBtn, isActive && { borderBottomColor: palette?.primary, borderBottomWidth: 2 }]}
                onPress={() => {
                  dispatch({ type: 'SET_MONTH', payload: m });
                  setStatsFilter('month');
                }}
              >
                <Text style={[styles.periodText, isActive && { color: colors?.text, fontWeight: '700' }]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.filterPicker}>
          {Object.entries(filterLabels).map(([key, label]) => (
            <Pressable
              key={key}
              style={[styles.filterChip, statsFilter === key && { backgroundColor: palette?.primary }]}
              onPress={() => setStatsFilter(key)}
            >
              <Text style={[styles.filterChipText, statsFilter === key && { color: '#fff' }]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Donut */}
        <View style={styles.chartCard}>
          <View style={styles.chartRow}>
            <View style={styles.donutWrap}>
              <Svg width={140} height={140} viewBox="0 0 140 140">
                {total > 0 ? donutSegments.map((seg, i) => {
                  const r = 55;
                  const c = 2 * Math.PI * r;
                  const strokeDash = (seg.sweep / 360) * c;
                  const rotation = seg.start - 90;
                  return (
                    <Circle
                      key={i}
                      cx={70}
                      cy={70}
                      r={r}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth={18}
                      strokeDasharray={`${strokeDash} ${c - strokeDash}`}
                      transform={`rotate(${rotation} 70 70)`}
                    />
                  );
                }) : (
                  <Circle cx={70} cy={70} r={55} fill="none" stroke={colors?.border ?? '#e2e8f0'} strokeWidth={18} />
                )}
              </Svg>
              <View style={styles.donutCenter}>
                <Text style={[styles.donutTotal, { color: colors?.text }]}>{state?.hideAmounts ? 'R$ ••••' : money(total)}</Text>
                <Text style={[styles.donutLabel, { color: colors?.muted }]}>{statsType === 'income' ? 'Receitas' : 'Despesas'}</Text>
              </View>
            </View>
            {/* Legend */}
            <View style={styles.legend}>
              {topCats.slice(0, 5).map(([name, data], i) => {
                const share = total ? (data.total / total) * 100 : 0;
                return (
                  <View key={name} style={styles.legendRow}>
                    <View style={[styles.legendDot, { borderColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                    <Text style={[styles.legendName, { color: colors?.text }]} numberOfLines={1}>{name}</Text>
                    <Text style={[styles.legendPct, { color: colors?.textSecondary }]}>{share.toFixed(1)}%</Text>
                  </View>
                );
              })}
              {topCats.length === 0 && <Text style={{ color: colors?.muted, fontSize: 12 }}>Sem movimentações neste período.</Text>}
            </View>
          </View>
        </View>

        {/* Category list */}
        {topCats.map(([name, data], i) => {
          const share = total ? (data.total / total) * 100 : 0;
          return (
            <Pressable
              key={name}
              style={[styles.catRow, { borderBottomColor: colors?.borderLight }]}
              onPress={() => router.push(`/category-detail?name=${encodeURIComponent(name)}&type=${statsType}&filter=${statsFilter}`)}
            >
              <View style={[styles.catIcon, { backgroundColor: `${CHART_COLORS[i % CHART_COLORS.length]}22` }]}>
                <Text style={{ fontSize: 18 }}>{data.icon || '•'}</Text>
              </View>
              <View style={styles.catInfo}>
                <View style={styles.catNameRow}>
                  <Text style={[styles.catName, { color: colors?.text }]} numberOfLines={1}>{name}</Text>
                  <Text style={[styles.catPct, { color: colors?.mutedLight }]}>{share.toFixed(1)}%</Text>
                </View>
                <View style={[styles.catTrack, { backgroundColor: colors?.borderLight }]}>
                  <View style={[styles.catTrackFill, { width: `${share}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }]} />
                </View>
              </View>
              <Text style={[styles.catTotal, { color: colors?.text }]}>{state?.hideAmounts ? 'R$ ••••' : money(data.total)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 18, paddingBottom: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  calendarBtn: { width: 36, height: 36, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  typeSwitch: { flexDirection: 'row', marginTop: 14, padding: 3, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.72)', backgroundColor: 'rgba(255,255,255,0.12)' },
  typeSwitchBtn: { flex: 1, paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  typeSwitchActive: { backgroundColor: '#fff' },
  typeSwitchText: { color: 'rgba(255,255,255,0.86)', fontSize: 13, fontWeight: '700' },
  typeSwitchTextActive: { color: '#1d4ed8' },
  periodRow: { borderBottomWidth: 1, paddingBottom: 8 },
  periodsScroll: { paddingHorizontal: 8, paddingTop: 8 },
  periodBtn: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  periodText: { fontSize: 12, color: '#94a3b8' },
  filterPicker: { flexDirection: 'row', paddingHorizontal: 8, gap: 4, marginTop: 4 },
  filterChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  filterChipText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  content: { flex: 1, paddingHorizontal: 16 },
  chartCard: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  chartRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  donutWrap: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  donutCenter: { position: 'absolute', alignItems: 'center' },
  donutTotal: { fontSize: 14, fontWeight: '800', fontVariant: ['tabular-nums'] },
  donutLabel: { fontSize: 9, marginTop: 2 },
  legend: { flex: 1, gap: 8 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 3 },
  legendName: { flex: 1, fontSize: 12 },
  legendPct: { fontSize: 11, fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1 },
  catIcon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  catInfo: { flex: 1, minWidth: 0 },
  catNameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catName: { fontSize: 13, fontWeight: '600', flex: 1 },
  catPct: { fontSize: 10 },
  catTrack: { height: 5, borderRadius: 99, marginTop: 5, overflow: 'hidden' },
  catTrackFill: { height: '100%', borderRadius: 99 },
  catTotal: { fontSize: 12, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
