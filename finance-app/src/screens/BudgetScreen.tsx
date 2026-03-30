import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, subMonths, addMonths } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { useFinance } from '../store/FinanceContext';
import { getCategoryById, EXPENSE_CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/currency';
import SetBudgetModal from '../components/SetBudgetModal';

function BudgetCard({
  categoryId,
  limit,
  spent,
  month,
  onEdit,
  onDelete,
}: {
  categoryId: string;
  limit: number;
  spent: number;
  month: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const cat = getCategoryById(categoryId);
  const pct = Math.min((spent / limit) * 100, 100);
  const actualPct = (spent / limit) * 100;
  const remaining = limit - spent;

  const barColor =
    actualPct >= 100 ? COLORS.danger :
    actualPct >= 80  ? COLORS.warning :
    COLORS.success;

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      cat?.name ?? categoryId,
      `Limit: ${formatCurrency(limit)}`,
      [
        { text: 'Edit Budget',   onPress: onEdit },
        { text: 'Remove Budget', style: 'destructive', onPress: () => {
          Alert.alert('Remove Budget', `Remove budget for ${cat?.name}?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: onDelete },
          ]);
        }},
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [cat, categoryId, limit, onEdit, onDelete]);

  return (
    <TouchableOpacity style={S.budgetCard} onPress={onEdit} onLongPress={handleLongPress} activeOpacity={0.8}>
      <View style={S.budgetCardHeader}>
        <View style={[S.catIconWrap, { backgroundColor: (cat?.color ?? COLORS.primary) + '22' }]}>
          <Text style={S.catIcon}>{cat?.icon ?? '📦'}</Text>
        </View>
        <View style={S.budgetCardInfo}>
          <Text style={S.catName}>{cat?.name ?? categoryId}</Text>
          <Text style={S.budgetSub}>
            {formatCurrency(spent)} spent of {formatCurrency(limit)}
          </Text>
        </View>
        <View style={S.budgetPctWrap}>
          <Text style={[S.budgetPct, { color: barColor }]}>{Math.round(actualPct)}%</Text>
          {remaining >= 0 ? (
            <Text style={S.budgetRemaining}>{formatCurrency(remaining)} left</Text>
          ) : (
            <Text style={[S.budgetRemaining, { color: COLORS.danger }]}>
              {formatCurrency(-remaining)} over
            </Text>
          )}
        </View>
      </View>

      {/* Progress bar */}
      <View style={S.progressBg}>
        <View style={[S.progressFill, { width: `${pct}%` as any, backgroundColor: barColor }]} />
      </View>

      {/* Alert badge */}
      {actualPct >= 100 && (
        <View style={[S.alertBadge, { backgroundColor: COLORS.dangerDim }]}>
          <Text style={[S.alertBadgeTxt, { color: COLORS.danger }]}>
            🚨 Budget exceeded — consider pausing {cat?.name?.toLowerCase()} spending
          </Text>
        </View>
      )}
      {actualPct >= 80 && actualPct < 100 && (
        <View style={[S.alertBadge, { backgroundColor: COLORS.warningDim }]}>
          <Text style={[S.alertBadgeTxt, { color: COLORS.warning }]}>
            ⚠️ Approaching limit — {formatCurrency(remaining)} remaining
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function BudgetScreen() {
  const { budgets, transactions, setBudget, deleteBudget, getCategorySpending } = useFinance();
  const [selectedDate,  setSelectedDate]  = useState(new Date());
  const [showModal,     setShowModal]     = useState(false);

  const month = format(selectedDate, 'yyyy-MM');
  const spending = useMemo(() => getCategorySpending(month), [getCategorySpending, month]);

  const monthBudgets = useMemo(
    () => budgets.filter(b => b.month === month),
    [budgets, month],
  );

  const summary = useMemo(() => {
    const totalLimit  = monthBudgets.reduce((s, b) => s + b.limit, 0);
    const totalSpent  = monthBudgets.reduce((s, b) => s + (spending[b.categoryId] ?? 0), 0);
    const overBudget  = monthBudgets.filter(b => (spending[b.categoryId] ?? 0) >= b.limit).length;
    const nearLimit   = monthBudgets.filter(b => {
      const pct = ((spending[b.categoryId] ?? 0) / b.limit) * 100;
      return pct >= 80 && pct < 100;
    }).length;
    return { totalLimit, totalSpent, overBudget, nearLimit };
  }, [monthBudgets, spending]);

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.title}>Budgets</Text>
            <Text style={S.subtitle}>{monthBudgets.length} categories tracked</Text>
          </View>
          <TouchableOpacity style={S.addBtn} onPress={() => setShowModal(true)}>
            <Text style={S.addBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Month nav */}
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

        {/* Summary strip */}
        {monthBudgets.length > 0 && (
          <View style={S.summaryStrip}>
            <View style={S.summaryItem}>
              <Text style={S.summaryNum}>{formatCurrency(summary.totalSpent, true)}</Text>
              <Text style={S.summaryLabel}>Spent</Text>
            </View>
            <View style={S.summaryDivider} />
            <View style={S.summaryItem}>
              <Text style={S.summaryNum}>{formatCurrency(summary.totalLimit, true)}</Text>
              <Text style={S.summaryLabel}>Total Limit</Text>
            </View>
            <View style={S.summaryDivider} />
            <View style={S.summaryItem}>
              <Text style={[S.summaryNum, { color: summary.overBudget > 0 ? COLORS.danger : COLORS.success }]}>
                {summary.overBudget}
              </Text>
              <Text style={S.summaryLabel}>Over Limit</Text>
            </View>
            <View style={S.summaryDivider} />
            <View style={S.summaryItem}>
              <Text style={[S.summaryNum, { color: summary.nearLimit > 0 ? COLORS.warning : COLORS.text }]}>
                {summary.nearLimit}
              </Text>
              <Text style={S.summaryLabel}>Near Limit</Text>
            </View>
          </View>
        )}

        {/* Overall progress */}
        {monthBudgets.length > 0 && summary.totalLimit > 0 && (
          <View style={S.overallCard}>
            <View style={S.overallRow}>
              <Text style={S.overallLabel}>Overall Budget Usage</Text>
              <Text style={[S.overallPct, {
                color: summary.totalSpent > summary.totalLimit ? COLORS.danger :
                       (summary.totalSpent / summary.totalLimit) >= 0.8 ? COLORS.warning : COLORS.success
              }]}>
                {Math.round((summary.totalSpent / summary.totalLimit) * 100)}%
              </Text>
            </View>
            <View style={S.overallBarBg}>
              <View style={[
                S.overallBarFill,
                {
                  width: `${Math.min(100, (summary.totalSpent / summary.totalLimit) * 100)}%` as any,
                  backgroundColor: summary.totalSpent > summary.totalLimit ? COLORS.danger :
                                   (summary.totalSpent / summary.totalLimit) >= 0.8 ? COLORS.warning : COLORS.primary,
                },
              ]} />
            </View>
            <Text style={S.overallSub}>
              {summary.totalSpent <= summary.totalLimit
                ? `${formatCurrency(summary.totalLimit - summary.totalSpent)} remaining across all budgets`
                : `${formatCurrency(summary.totalSpent - summary.totalLimit)} over total budget`}
            </Text>
          </View>
        )}

        {/* Budget cards */}
        <View style={S.cardsSection}>
          {monthBudgets.length === 0 ? (
            <View style={S.empty}>
              <Text style={S.emptyIcon}>🎯</Text>
              <Text style={S.emptyTxt}>No budgets set</Text>
              <Text style={S.emptySub}>Tap + to set monthly limits per category</Text>
              <TouchableOpacity style={S.emptyBtn} onPress={() => setShowModal(true)}>
                <Text style={S.emptyBtnTxt}>Set First Budget</Text>
              </TouchableOpacity>
            </View>
          ) : (
            monthBudgets.map(b => (
              <BudgetCard
                key={b.categoryId}
                categoryId={b.categoryId}
                limit={b.limit}
                spent={spending[b.categoryId] ?? 0}
                month={month}
                onEdit={() => setShowModal(true)}
                onDelete={() => deleteBudget(b.categoryId, month)}
              />
            ))
          )}
        </View>
      </ScrollView>

      <SetBudgetModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={setBudget}
        month={month}
        existingBudgets={budgets}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: SPACING.md, paddingTop: SPACING.sm, paddingBottom: SPACING.sm,
  },
  title:    { color: COLORS.text, fontSize: FONT.xl, fontWeight: '800' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT.xs, marginTop: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  addBtnTxt: { color: COLORS.text, fontSize: 24, fontWeight: '300', marginTop: -2 },

  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingBottom: SPACING.sm },
  monthArrow: { paddingHorizontal: SPACING.lg, paddingVertical: 4 },
  monthArrowTxt: { color: COLORS.primary, fontSize: 28, fontWeight: '300' },
  monthLabel: { color: COLORS.text, fontSize: FONT.md, fontWeight: '600', minWidth: 140, textAlign: 'center' },

  summaryStrip: {
    flexDirection: 'row', backgroundColor: COLORS.card,
    marginHorizontal: SPACING.md, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.md,
  },
  summaryItem:    { flex: 1, alignItems: 'center' },
  summaryDivider: { width: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },
  summaryNum:     { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
  summaryLabel:   { color: COLORS.textSecondary, fontSize: FONT.xs, marginTop: 2 },

  overallCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginHorizontal: SPACING.md, marginBottom: SPACING.md,
  },
  overallRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  overallLabel: { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600' },
  overallPct:   { fontSize: FONT.md, fontWeight: '700' },
  overallBarBg: { height: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 8 },
  overallBarFill: { height: '100%', borderRadius: RADIUS.full },
  overallSub: { color: COLORS.textSecondary, fontSize: FONT.xs },

  cardsSection: { paddingHorizontal: SPACING.md, gap: SPACING.sm },

  budgetCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md,
  },
  budgetCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: 12 },
  catIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  catIcon:     { fontSize: 22 },
  budgetCardInfo: { flex: 1 },
  catName:     { color: COLORS.text, fontSize: FONT.md, fontWeight: '600' },
  budgetSub:   { color: COLORS.textSecondary, fontSize: FONT.xs, marginTop: 2 },
  budgetPctWrap: { alignItems: 'flex-end' },
  budgetPct:   { fontSize: FONT.md, fontWeight: '700' },
  budgetRemaining: { color: COLORS.textSecondary, fontSize: FONT.xs, marginTop: 2 },

  progressBg:   { height: 8, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: RADIUS.full },

  alertBadge:    { borderRadius: RADIUS.sm, padding: 8 },
  alertBadgeTxt: { fontSize: FONT.xs, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTxt:  { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  emptySub:  { color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 8, textAlign: 'center' },
  emptyBtn: {
    marginTop: SPACING.lg, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xl, paddingVertical: 12,
  },
  emptyBtnTxt: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
});
