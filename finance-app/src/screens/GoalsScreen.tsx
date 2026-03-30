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
import Svg, { Circle } from 'react-native-svg';
import { format, differenceInDays, parseISO, addDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { useFinance } from '../store/FinanceContext';
import { formatCurrency } from '../utils/currency';
import { Goal } from '../types';
import AddGoalModal from '../components/AddGoalModal';
import ContributeModal from '../components/ContributeModal';

// ─── Ring progress component ─────────────────────────────────────────────────

function Ring({ pct, color, size = 72 }: { pct: number; color: string; size?: number }) {
  const cx        = size / 2;
  const cy        = size / 2;
  const r         = (size - 10) / 2;
  const circumference = 2 * Math.PI * r;
  const stroke    = circumference * (1 - Math.min(pct / 100, 1));

  return (
    <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
      <Circle cx={cx} cy={cy} r={r} stroke={COLORS.surface} strokeWidth={7} fill="none" />
      <Circle
        cx={cx} cy={cy} r={r}
        stroke={color}
        strokeWidth={7}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={stroke}
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ─── Forecast helper ─────────────────────────────────────────────────────────

function forecastCompletion(goal: Goal): string {
  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return 'Completed!';

  const daysElapsed = differenceInDays(new Date(), parseISO(goal.createdAt));
  if (daysElapsed < 7 || goal.currentAmount === 0) {
    // Not enough data — use deadline
    return `Target: ${format(parseISO(goal.deadline), 'MMM d, yyyy')}`;
  }

  const dailyRate = goal.currentAmount / daysElapsed;
  if (dailyRate <= 0) return 'No progress yet';

  const daysNeeded = Math.ceil(remaining / dailyRate);
  const forecast   = addDays(new Date(), daysNeeded);
  const deadline   = parseISO(goal.deadline);

  if (forecast <= deadline) {
    return `On track · ~${format(forecast, 'MMM d, yyyy')}`;
  }
  const overBy = differenceInDays(forecast, deadline);
  return `${overBy}d late · Speed up to meet ${format(deadline, 'MMM d')}`;
}

// ─── Goal card ───────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  onContribute,
  onDelete,
}: {
  goal: Goal;
  onContribute: (goal: Goal) => void;
  onDelete: (id: string) => void;
}) {
  const pct       = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  const remaining = goal.targetAmount - goal.currentAmount;
  const daysLeft  = differenceInDays(parseISO(goal.deadline), new Date());
  const isComplete = goal.currentAmount >= goal.targetAmount;
  const forecast  = useMemo(() => forecastCompletion(goal), [goal]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(goal.name, '', [
      { text: 'Delete Goal', style: 'destructive', onPress: () => {
        Alert.alert('Delete Goal', `Delete "${goal.name}"? This cannot be undone.`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => onDelete(goal.id) },
        ]);
      }},
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [goal, onDelete]);

  return (
    <TouchableOpacity
      style={[S.goalCard, isComplete && S.goalCardComplete]}
      onPress={() => !isComplete && onContribute(goal)}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
    >
      {isComplete && (
        <View style={[S.completeBadge, { backgroundColor: goal.color + '33' }]}>
          <Text style={[S.completeBadgeTxt, { color: goal.color }]}>✓ Goal Reached!</Text>
        </View>
      )}

      <View style={S.goalCardTop}>
        {/* Ring + icon */}
        <View style={S.ringWrap}>
          <Ring pct={pct} color={goal.color} size={72} />
          <View style={S.ringIconOverlay}>
            <Text style={S.ringIcon}>{goal.icon}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={S.goalInfo}>
          <Text style={S.goalName}>{goal.name}</Text>
          <Text style={S.goalSub}>
            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
          </Text>
          <View style={S.pctRow}>
            <View style={[S.pctPill, { backgroundColor: goal.color + '22' }]}>
              <Text style={[S.pctPillTxt, { color: goal.color }]}>{Math.round(pct)}%</Text>
            </View>
            {!isComplete && (
              <Text style={S.remainingTxt}>{formatCurrency(remaining)} to go</Text>
            )}
          </View>
        </View>

        {/* Deadline */}
        <View style={S.deadlineCol}>
          <Text style={S.deadlineLabel}>Deadline</Text>
          <Text style={[S.deadlineDays, { color: daysLeft < 30 ? COLORS.warning : COLORS.text }]}>
            {daysLeft >= 0 ? `${daysLeft}d` : 'Overdue'}
          </Text>
          <Text style={S.deadlineDate}>{format(parseISO(goal.deadline), 'MMM d')}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={S.goalBarBg}>
        <View style={[S.goalBarFill, { width: `${pct}%` as any, backgroundColor: goal.color }]} />
      </View>

      {/* Forecast */}
      <Text style={[S.forecast, isComplete && { color: goal.color }]}>{forecast}</Text>

      {!isComplete && (
        <TouchableOpacity
          style={[S.contributeBtn, { backgroundColor: goal.color + '22', borderColor: goal.color }]}
          onPress={() => onContribute(goal)}
        >
          <Text style={[S.contributeBtnTxt, { color: goal.color }]}>+ Add Progress</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GoalsScreen() {
  const { goals, addGoal, deleteGoal, contribute } = useFinance();
  const [showAddModal,  setShowAddModal]  = useState(false);
  const [activeGoal,    setActiveGoal]    = useState<Goal | null>(null);

  const activeGoals    = useMemo(() => goals.filter(g => g.currentAmount < g.targetAmount), [goals]);
  const completedGoals = useMemo(() => goals.filter(g => g.currentAmount >= g.targetAmount), [goals]);

  const totalSaved  = useMemo(() => goals.reduce((s, g) => s + g.currentAmount, 0), [goals]);
  const totalTarget = useMemo(() => goals.reduce((s, g) => s + g.targetAmount, 0), [goals]);

  const handleContribute = useCallback((goal: Goal) => {
    setActiveGoal(goal);
  }, []);

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={S.header}>
          <View>
            <Text style={S.title}>Goals</Text>
            <Text style={S.subtitle}>{goals.length} goals · {completedGoals.length} completed</Text>
          </View>
          <TouchableOpacity style={S.addBtn} onPress={() => setShowAddModal(true)}>
            <Text style={S.addBtnTxt}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Summary card */}
        {goals.length > 0 && (
          <View style={S.summaryCard}>
            <View style={S.summaryLeft}>
              <Text style={S.summaryLabel}>Total Saved</Text>
              <Text style={S.summaryValue}>{formatCurrency(totalSaved, true)}</Text>
              <Text style={S.summaryOf}>of {formatCurrency(totalTarget, true)}</Text>
            </View>
            <View style={S.summaryRight}>
              <Ring
                pct={totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0}
                color={COLORS.primary}
                size={80}
              />
              <View style={[S.summaryRingLabel, { position: 'absolute' }]}>
                <Text style={S.summaryRingPct}>
                  {totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Active goals */}
        {activeGoals.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>In Progress</Text>
            {activeGoals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onContribute={handleContribute}
                onDelete={deleteGoal}
              />
            ))}
          </View>
        )}

        {/* Completed goals */}
        {completedGoals.length > 0 && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Completed 🎉</Text>
            {completedGoals.map(g => (
              <GoalCard
                key={g.id}
                goal={g}
                onContribute={handleContribute}
                onDelete={deleteGoal}
              />
            ))}
          </View>
        )}

        {/* Empty state */}
        {goals.length === 0 && (
          <View style={S.empty}>
            <Text style={S.emptyIcon}>🎯</Text>
            <Text style={S.emptyTxt}>No goals yet</Text>
            <Text style={S.emptySub}>Set savings targets and track your progress toward financial freedom</Text>
            <TouchableOpacity style={S.emptyBtn} onPress={() => setShowAddModal(true)}>
              <Text style={S.emptyBtnTxt}>Create First Goal</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AddGoalModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={addGoal}
      />

      <ContributeModal
        visible={!!activeGoal}
        goal={activeGoal}
        onClose={() => setActiveGoal(null)}
        onContribute={amount => {
          if (activeGoal) contribute(activeGoal.id, amount);
          setActiveGoal(null);
        }}
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

  summaryCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    marginHorizontal: SPACING.md, marginBottom: SPACING.md,
    padding: SPACING.lg,
  },
  summaryLeft:  { gap: 4 },
  summaryLabel: { color: COLORS.textSecondary, fontSize: FONT.sm },
  summaryValue: { color: COLORS.text, fontSize: FONT.xxl, fontWeight: '800' },
  summaryOf:    { color: COLORS.textSecondary, fontSize: FONT.xs },
  summaryRight: { alignItems: 'center', justifyContent: 'center' },
  summaryRingLabel: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  summaryRingPct: { color: COLORS.text, fontSize: FONT.sm, fontWeight: '700' },

  section:      { paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  sectionTitle: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700', marginBottom: SPACING.sm },

  goalCard: {
    backgroundColor: COLORS.card, borderRadius: RADIUS.xl,
    borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.md, marginBottom: SPACING.sm,
  },
  goalCardComplete: { borderColor: COLORS.successDim },

  completeBadge: { borderRadius: RADIUS.sm, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginBottom: 10 },
  completeBadgeTxt: { fontSize: FONT.xs, fontWeight: '700' },

  goalCardTop: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  ringWrap: { position: 'relative', width: 72, height: 72 },
  ringIconOverlay: { position: 'absolute', width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
  ringIcon: { fontSize: 26 },

  goalInfo:  { flex: 1 },
  goalName:  { color: COLORS.text, fontSize: FONT.md, fontWeight: '700', marginBottom: 4 },
  goalSub:   { color: COLORS.textSecondary, fontSize: FONT.xs, marginBottom: 6 },
  pctRow:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pctPill:   { borderRadius: RADIUS.full, paddingHorizontal: 8, paddingVertical: 3 },
  pctPillTxt: { fontSize: FONT.xs, fontWeight: '700' },
  remainingTxt: { color: COLORS.textSecondary, fontSize: FONT.xs },

  deadlineCol:   { alignItems: 'flex-end' },
  deadlineLabel: { color: COLORS.textMuted, fontSize: FONT.xs },
  deadlineDays:  { fontSize: FONT.lg, fontWeight: '700', marginTop: 2 },
  deadlineDate:  { color: COLORS.textSecondary, fontSize: FONT.xs },

  goalBarBg:   { height: 6, backgroundColor: COLORS.surface, borderRadius: RADIUS.full, overflow: 'hidden', marginVertical: SPACING.sm },
  goalBarFill: { height: '100%', borderRadius: RADIUS.full },

  forecast: { color: COLORS.textSecondary, fontSize: FONT.xs, marginBottom: SPACING.sm },

  contributeBtn: {
    borderRadius: RADIUS.md, borderWidth: 1,
    paddingVertical: 10, alignItems: 'center',
    marginTop: 4,
  },
  contributeBtnTxt: { fontSize: FONT.sm, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl, paddingHorizontal: SPACING.xl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTxt:  { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  emptySub:  { color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 8, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: SPACING.lg, backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingHorizontal: SPACING.xl, paddingVertical: 12,
  },
  emptyBtnTxt: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
});
