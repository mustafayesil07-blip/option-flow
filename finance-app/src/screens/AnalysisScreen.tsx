import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { G, Path, Circle, Text as SvgText, Rect } from 'react-native-svg';
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { useFinance } from '../store/FinanceContext';
import { getCategoryById } from '../constants/categories';
import { formatCurrency } from '../utils/currency';

const { width: SCREEN_W } = Dimensions.get('window');
const CHART_SIZE = Math.min(SCREEN_W - 80, 240);

// ─── Donut Chart ─────────────────────────────────────────────────────────────

interface DonutSlice { value: number; color: string; label: string; icon: string }

function DonutChart({ slices, total }: { slices: DonutSlice[]; total: number }) {
  const cx = CHART_SIZE / 2;
  const cy = CHART_SIZE / 2;
  const R  = CHART_SIZE / 2 - 10;
  const r  = R * 0.55;

  function polarToXY(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function describeArc(startAngle: number, endAngle: number): string {
    const s  = polarToXY(startAngle, R);
    const e  = polarToXY(endAngle,   R);
    const si = polarToXY(startAngle, r);
    const ei = polarToXY(endAngle,   r);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${s.x} ${s.y}`,
      `A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`,
      `L ${ei.x} ${ei.y}`,
      `A ${r} ${r} 0 ${large} 0 ${si.x} ${si.y}`,
      'Z',
    ].join(' ');
  }

  if (total === 0) {
    return (
      <View style={{ width: CHART_SIZE, height: CHART_SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Circle cx={cx} cy={cy} r={R} fill={COLORS.surface} />
        <Text style={{ color: COLORS.textMuted, fontSize: FONT.sm }}>No data</Text>
      </View>
    );
  }

  let cursor = 0;
  const paths = slices.map(slice => {
    const sweep = (slice.value / total) * 360;
    const path  = describeArc(cursor, cursor + sweep - 0.5);
    cursor += sweep;
    return { ...slice, path };
  });

  return (
    <Svg width={CHART_SIZE} height={CHART_SIZE}>
      {paths.map((p, i) => (
        <Path key={i} d={p.path} fill={p.color} />
      ))}
      {/* Center hole label */}
      <Circle cx={cx} cy={cy} r={r - 4} fill={COLORS.background} />
      <SvgText
        x={cx} y={cy - 8}
        textAnchor="middle"
        fill={COLORS.textSecondary}
        fontSize={FONT.xs}
        fontWeight="600"
      >Total</SvgText>
      <SvgText
        x={cx} y={cy + 12}
        textAnchor="middle"
        fill={COLORS.text}
        fontSize={FONT.md}
        fontWeight="700"
      >{formatCurrency(total, true)}</SvgText>
    </Svg>
  );
}

// ─── Bar Chart (6-month trend) ────────────────────────────────────────────────

function TrendChart({ data }: { data: { label: string; income: number; expenses: number }[] }) {
  const maxVal = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);
  const BAR_W  = 18;
  const GAP    = 6;
  const GROUP  = BAR_W * 2 + GAP + 16;
  const H      = 120;
  const chartW = data.length * GROUP;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <Svg width={chartW} height={H + 24}>
        {data.map((d, i) => {
          const x = i * GROUP;
          const incomeH  = (d.income   / maxVal) * H;
          const expenseH = (d.expenses / maxVal) * H;
          return (
            <G key={i}>
              {/* Income bar */}
              <Rect
                x={x} y={H - incomeH} width={BAR_W} height={incomeH}
                rx={4} fill={COLORS.income + 'BB'}
              />
              {/* Expense bar */}
              <Rect
                x={x + BAR_W + GAP} y={H - expenseH} width={BAR_W} height={expenseH}
                rx={4} fill={COLORS.expense + 'BB'}
              />
              {/* Label */}
              <SvgText
                x={x + BAR_W} y={H + 18}
                textAnchor="middle"
                fill={COLORS.textSecondary}
                fontSize={10}
              >{d.label}</SvgText>
            </G>
          );
        })}
      </Svg>
    </ScrollView>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AnalysisScreen() {
  const { transactions } = useFinance();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const month = format(selectedDate, 'yyyy-MM');

  const spending = useMemo(() => {
    const map: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense' && t.date.startsWith(month))
      .forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return map;
  }, [transactions, month]);

  const totalExpenses = useMemo(
    () => Object.values(spending).reduce((s, v) => s + v, 0),
    [spending],
  );

  const totalIncome = useMemo(
    () => transactions.filter(t => t.type === 'income' && t.date.startsWith(month)).reduce((s, t) => s + t.amount, 0),
    [transactions, month],
  );

  const topCategories = useMemo(
    () => Object.entries(spending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id, amount]) => ({ id, amount, cat: getCategoryById(id) })),
    [spending],
  );

  const donutSlices: DonutSlice[] = useMemo(
    () => topCategories.slice(0, 7).map(({ id, amount, cat }) => ({
      value: amount,
      color: cat?.color ?? COLORS.primary,
      label: cat?.name ?? id,
      icon:  cat?.icon ?? '📦',
    })),
    [topCategories],
  );

  // 6-month trend
  const trendData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(selectedDate, 5 - i);
      const m = format(d, 'yyyy-MM');
      const income   = transactions.filter(t => t.type === 'income'  && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0);
      const expenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith(m)).reduce((s, t) => s + t.amount, 0);
      return { label: format(d, 'MMM'), income, expenses };
    });
  }, [transactions, selectedDate]);

  // Month-over-month comparison
  const prevMonth = format(subMonths(selectedDate, 1), 'yyyy-MM');
  const prevExpenses = useMemo(
    () => transactions.filter(t => t.type === 'expense' && t.date.startsWith(prevMonth)).reduce((s, t) => s + t.amount, 0),
    [transactions, prevMonth],
  );
  const momChange = prevExpenses > 0
    ? ((totalExpenses - prevExpenses) / prevExpenses) * 100
    : null;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={S.header}>
          <Text style={S.title}>Analysis</Text>
          <Text style={S.subtitle}>Spending patterns & trends</Text>
        </View>

        {/* Month selector */}
        <View style={S.monthRow}>
          <TouchableOpacity onPress={() => setSelectedDate(d => subMonths(d, 1))} style={S.monthArrow}>
            <Text style={S.monthArrowTxt}>‹</Text>
          </TouchableOpacity>
          <Text style={S.monthLabel}>{format(selectedDate, 'MMMM yyyy')}</Text>
          <TouchableOpacity
            onPress={() => setSelectedDate(d => addMonths(d, 1))}
            style={S.monthArrow}
            disabled={format(addMonths(selectedDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
          >
            <Text style={[S.monthArrowTxt,
              format(addMonths(selectedDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM') && { color: COLORS.textMuted }
            ]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Stats row */}
        <View style={S.statsRow}>
          <View style={S.statCard}>
            <Text style={S.statLabel}>Income</Text>
            <Text style={[S.statValue, { color: COLORS.income }]}>{formatCurrency(totalIncome, true)}</Text>
          </View>
          <View style={S.statCard}>
            <Text style={S.statLabel}>Expenses</Text>
            <Text style={[S.statValue, { color: COLORS.expense }]}>{formatCurrency(totalExpenses, true)}</Text>
          </View>
          <View style={S.statCard}>
            <Text style={S.statLabel}>vs Last Month</Text>
            {momChange !== null ? (
              <Text style={[S.statValue, { color: momChange <= 0 ? COLORS.success : COLORS.danger }]}>
                {momChange > 0 ? '+' : ''}{Math.round(momChange)}%
              </Text>
            ) : (
              <Text style={[S.statValue, { color: COLORS.textMuted }]}>—</Text>
            )}
          </View>
        </View>

        {/* Donut chart */}
        {totalExpenses > 0 ? (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Spending by Category</Text>
            <View style={S.donutCard}>
              <DonutChart slices={donutSlices} total={totalExpenses} />
              <View style={S.legend}>
                {donutSlices.map(s => (
                  <View key={s.label} style={S.legendItem}>
                    <View style={[S.legendDot, { backgroundColor: s.color }]} />
                    <Text style={S.legendIcon}>{s.icon}</Text>
                    <Text style={S.legendLabel} numberOfLines={1}>{s.label}</Text>
                    <Text style={S.legendValue}>{formatCurrency(s.value, true)}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ) : (
          <View style={S.emptyChart}>
            <Text style={S.emptyIcon}>📊</Text>
            <Text style={S.emptyTxt}>No expense data for this month</Text>
          </View>
        )}

        {/* Top categories */}
        {topCategories.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Top Categories</Text>
            <View style={S.catList}>
              {topCategories.map(({ id, amount, cat }, rank) => {
                const pct = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
                return (
                  <View key={id} style={[S.catRow, rank < topCategories.length - 1 && S.catRowBorder]}>
                    <Text style={S.rankNum}>#{rank + 1}</Text>
                    <View style={[S.catIconWrap, { backgroundColor: (cat?.color ?? COLORS.primary) + '22' }]}>
                      <Text style={S.catIcon}>{cat?.icon ?? '📦'}</Text>
                    </View>
                    <View style={S.catInfo}>
                      <View style={S.catInfoRow}>
                        <Text style={S.catName}>{cat?.name ?? id}</Text>
                        <Text style={S.catAmount}>{formatCurrency(amount)}</Text>
                      </View>
                      <View style={S.catBarBg}>
                        <View style={[
                          S.catBarFill,
                          { width: `${pct}%` as any, backgroundColor: cat?.color ?? COLORS.primary },
                        ]} />
                      </View>
                      <Text style={S.catPct}>{Math.round(pct)}% of total</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 6-month trend */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>6-Month Trend</Text>
          <View style={S.trendCard}>
            <TrendChart data={trendData} />
            <View style={S.trendLegend}>
              <View style={S.trendLegendItem}>
                <View style={[S.trendDot, { backgroundColor: COLORS.income }]} />
                <Text style={S.trendLegendTxt}>Income</Text>
              </View>
              <View style={S.trendLegendItem}>
                <View style={[S.trendDot, { backgroundColor: COLORS.expense }]} />
                <Text style={S.trendLegendTxt}>Expenses</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },

  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  title:    { color: COLORS.text, fontSize: FONT.xl, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT.xs, marginTop: 2 },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm },
  monthArrow: { paddingHorizontal: SPACING.lg, paddingVertical: 4 },
  monthArrowTxt: { color: COLORS.primary, fontSize: 28, fontWeight: '300' },
  monthLabel: { color: COLORS.text, fontSize: FONT.md, fontWeight: '600', minWidth: 140, textAlign: 'center' },

  statsRow: { flexDirection: 'row', gap: SPACING.sm, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  statCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.sm,
  },
  statLabel: { color: COLORS.textSecondary, fontSize: FONT.xs, marginBottom: 4 },
  statValue: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },

  section:      { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700', marginBottom: SPACING.sm },

  donutCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, alignItems: 'center',
  },
  legend: { width: '100%', marginTop: SPACING.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  legendDot:   { width: 8, height: 8, borderRadius: 4 },
  legendIcon:  { fontSize: 14 },
  legendLabel: { flex: 1, color: COLORS.textSecondary, fontSize: FONT.sm },
  legendValue: { color: COLORS.text, fontSize: FONT.sm, fontWeight: '600' },

  emptyChart: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyIcon:  { fontSize: 48, marginBottom: SPACING.sm },
  emptyTxt:   { color: COLORS.textSecondary, fontSize: FONT.sm },

  catList: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  catRow:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  rankNum:      { color: COLORS.textMuted, fontSize: FONT.xs, fontWeight: '700', width: 20, textAlign: 'center' },
  catIconWrap:  { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  catIcon:      { fontSize: 18 },
  catInfo:      { flex: 1 },
  catInfoRow:   { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  catName:      { color: COLORS.text, fontSize: FONT.sm, fontWeight: '600' },
  catAmount:    { color: COLORS.text, fontSize: FONT.sm, fontWeight: '700' },
  catBarBg:     { height: 4, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 4 },
  catBarFill:   { height: '100%', borderRadius: RADIUS.full },
  catPct:       { color: COLORS.textMuted, fontSize: FONT.xs },

  trendCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  trendLegend: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  trendLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trendDot: { width: 8, height: 8, borderRadius: 4 },
  trendLegendTxt: { color: COLORS.textSecondary, fontSize: FONT.xs },
});
