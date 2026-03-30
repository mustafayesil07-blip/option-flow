import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, subMonths, addMonths } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { useFinance } from '../store/FinanceContext';
import { getCategoryById } from '../constants/categories';
import { formatCurrency } from '../utils/currency';
import { generateInsights } from '../utils/insights';

function BalanceCard({ income, expenses, net }: { income: number; expenses: number; net: number }) {
  return (
    <View style={S.balanceCard}>
      <Text style={S.balanceLabel}>Net Balance</Text>
      <Text style={[S.balanceAmount, { color: net >= 0 ? COLORS.success : COLORS.danger }]}>
        {net >= 0 ? '+' : ''}{formatCurrency(net)}
      </Text>
      <View style={S.balanceRow}>
        <View style={S.statPill}>
          <View style={[S.pillDot, { backgroundColor: COLORS.income }]} />
          <Text style={S.pillLabel}>Income</Text>
          <Text style={[S.pillValue, { color: COLORS.income }]}>{formatCurrency(income, true)}</Text>
        </View>
        <View style={S.pillDivider} />
        <View style={S.statPill}>
          <View style={[S.pillDot, { backgroundColor: COLORS.expense }]} />
          <Text style={S.pillLabel}>Expenses</Text>
          <Text style={[S.pillValue, { color: COLORS.expense }]}>{formatCurrency(expenses, true)}</Text>
        </View>
      </View>
      {income > 0 && (
        <View style={S.savingsBar}>
          <View style={S.savingsBarBg}>
            <View
              style={[
                S.savingsBarFill,
                { width: `${Math.min(100, (expenses / income) * 100)}%` as any,
                  backgroundColor: expenses > income ? COLORS.danger : COLORS.primary },
              ]}
            />
          </View>
          <Text style={S.savingsLabel}>
            {expenses <= income
              ? `Saving ${Math.round(((income - expenses) / income) * 100)}% of income`
              : `Over income by ${formatCurrency(expenses - income)}`}
          </Text>
        </View>
      )}
    </View>
  );
}

function InsightCard({ type, title, message }: { type: string; title: string; message: string }) {
  const colors: Record<string, { bg: string; border: string; dot: string }> = {
    warning: { bg: COLORS.warningDim, border: COLORS.warning, dot: COLORS.warning },
    info:    { bg: COLORS.primaryDim, border: COLORS.primary, dot: COLORS.primary },
    success: { bg: COLORS.successDim, border: COLORS.success, dot: COLORS.success },
  };
  const c = colors[type] ?? colors.info;
  return (
    <View style={[S.insightCard, { backgroundColor: c.bg, borderColor: c.border }]}>
      <View style={[S.insightDot, { backgroundColor: c.dot }]} />
      <View style={S.insightContent}>
        <Text style={S.insightTitle}>{title}</Text>
        <Text style={S.insightMsg}>{message}</Text>
      </View>
    </View>
  );
}

function BudgetRow({ catId, month }: { catId: string; month: string }) {
  const { getBudgetStatus } = useFinance();
  const status = getBudgetStatus(catId, month);
  const cat = getCategoryById(catId);
  if (!status || !cat) return null;

  const pct = Math.min(100, status.pct);
  const barColor = status.pct >= 100 ? COLORS.danger : status.pct >= 80 ? COLORS.warning : COLORS.primary;

  return (
    <View style={S.budgetRow}>
      <View style={S.budgetRowLeft}>
        <Text style={S.budgetCatIcon}>{cat.icon}</Text>
        <View>
          <Text style={S.budgetCatName}>{cat.name}</Text>
          <Text style={S.budgetCatSub}>
            {formatCurrency(status.spent)} / {formatCurrency(status.limit)}
          </Text>
        </View>
      </View>
      <Text style={[S.budgetPct, { color: barColor }]}>{Math.round(status.pct)}%</Text>
      <View style={S.budgetBarBg}>
        <View style={[S.budgetBarFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const { transactions, budgets, getMonthStats, getCategorySpending } = useFinance();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const month = format(selectedDate, 'yyyy-MM');

  const stats = useMemo(() => getMonthStats(month), [getMonthStats, month]);
  const insights = useMemo(() => generateInsights(transactions, budgets), [transactions, budgets]);

  const topBudgets = useMemo(() => {
    return budgets
      .filter(b => b.month === month)
      .map(b => {
        const spent = transactions
          .filter(t => t.type === 'expense' && t.category === b.categoryId && t.date.startsWith(month))
          .reduce((s, t) => s + t.amount, 0);
        return { ...b, pct: (spent / b.limit) * 100 };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 4);
  }, [budgets, transactions, month]);

  const recentTx = useMemo(() =>
    transactions.filter(t => t.date.startsWith(month)).slice(0, 5),
    [transactions, month],
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  }, []);

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView style={S.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.greeting}>{greeting} 👋</Text>
            <Text style={S.headerSub}>Here's your financial overview</Text>
          </View>
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
            <Text style={[S.monthArrowTxt, format(addMonths(selectedDate, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM') && S.monthArrowDisabled]}>
              ›
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance card */}
        <BalanceCard {...stats} />

        {/* Insights */}
        {insights.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Insights</Text>
            {insights.map(i => (
              <InsightCard key={i.id} type={i.type} title={i.title} message={i.message} />
            ))}
          </View>
        )}

        {/* Budget overview */}
        {topBudgets.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Budget Status</Text>
            <View style={S.card}>
              {topBudgets.map(b => (
                <BudgetRow key={b.categoryId} catId={b.categoryId} month={month} />
              ))}
            </View>
          </View>
        )}

        {/* Recent transactions */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Recent Transactions</Text>
          {recentTx.length === 0 ? (
            <View style={S.emptyBox}>
              <Text style={S.emptyIcon}>📭</Text>
              <Text style={S.emptyTxt}>No transactions this month</Text>
              <Text style={S.emptySub}>Tap + on the Transactions tab to add one</Text>
            </View>
          ) : (
            <View style={S.card}>
              {recentTx.map((tx, i) => {
                const cat = getCategoryById(tx.category);
                return (
                  <View key={tx.id} style={[S.txRow, i < recentTx.length - 1 && S.txBorder]}>
                    <View style={[S.txIconWrap, { backgroundColor: (cat?.color ?? COLORS.primary) + '22' }]}>
                      <Text style={S.txIcon}>{cat?.icon ?? '📦'}</Text>
                    </View>
                    <View style={S.txInfo}>
                      <Text style={S.txDesc} numberOfLines={1}>{tx.description}</Text>
                      <Text style={S.txCat}>{cat?.name ?? tx.category} · {tx.date}</Text>
                    </View>
                    <Text style={[S.txAmount, { color: tx.type === 'income' ? COLORS.income : COLORS.expense }]}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },

  header: { paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.xs },
  greeting:  { color: COLORS.text, fontSize: FONT.xl, fontWeight: '800' },
  headerSub: { color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 },

  monthRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  monthArrow:       { paddingHorizontal: SPACING.lg, paddingVertical: 4 },
  monthArrowTxt:    { color: COLORS.primary, fontSize: 28, fontWeight: '300' },
  monthArrowDisabled: { color: COLORS.textMuted },
  monthLabel:       { color: COLORS.text, fontSize: FONT.md, fontWeight: '600', minWidth: 140, textAlign: 'center' },

  balanceCard: {
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  balanceLabel:  { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600', marginBottom: 4 },
  balanceAmount: { fontSize: FONT.xxxl, fontWeight: '800', marginBottom: SPACING.md },

  balanceRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  statPill:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillDivider:{ width: 1, height: 24, backgroundColor: COLORS.border, marginHorizontal: SPACING.sm },
  pillDot:    { width: 8, height: 8, borderRadius: 4 },
  pillLabel:  { color: COLORS.textSecondary, fontSize: FONT.sm, flex: 1 },
  pillValue:  { fontSize: FONT.md, fontWeight: '700' },

  savingsBar: { gap: 6 },
  savingsBarBg: {
    height: 4, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, overflow: 'hidden',
  },
  savingsBarFill: { height: '100%', borderRadius: RADIUS.full },
  savingsLabel: { color: COLORS.textSecondary, fontSize: FONT.xs },

  section: { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700', marginBottom: SPACING.sm },

  card: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },

  insightCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    borderRadius: RADIUS.md, borderWidth: 1, padding: SPACING.sm,
    marginBottom: 8,
  },
  insightDot:     { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  insightContent: { flex: 1 },
  insightTitle:   { color: COLORS.text, fontSize: FONT.sm, fontWeight: '700', marginBottom: 2 },
  insightMsg:     { color: COLORS.textSecondary, fontSize: FONT.xs },

  budgetRow: {
    padding: SPACING.md, gap: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  budgetRowLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 4 },
  budgetCatIcon: { fontSize: 20 },
  budgetCatName: { color: COLORS.text, fontSize: FONT.sm, fontWeight: '600' },
  budgetCatSub:  { color: COLORS.textSecondary, fontSize: FONT.xs },
  budgetPct:     { fontSize: FONT.xs, fontWeight: '700', textAlign: 'right', marginBottom: 2 },
  budgetBarBg:   { height: 4, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: RADIUS.full },

  txRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SPACING.md, paddingVertical: 12, gap: SPACING.sm,
  },
  txBorder:   { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  txIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txIcon:     { fontSize: 18 },
  txInfo:     { flex: 1 },
  txDesc:     { color: COLORS.text, fontSize: FONT.sm, fontWeight: '600' },
  txCat:      { color: COLORS.textSecondary, fontSize: FONT.xs, marginTop: 2 },
  txAmount:   { fontSize: FONT.sm, fontWeight: '700' },

  emptyBox: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyIcon: { fontSize: 40, marginBottom: SPACING.sm },
  emptyTxt:  { color: COLORS.text, fontSize: FONT.md, fontWeight: '600' },
  emptySub:  { color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 4, textAlign: 'center' },
});
