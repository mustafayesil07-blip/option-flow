import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { format, subMonths, addMonths } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { useFinance } from '../store/FinanceContext';
import { getCategoryById, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/currency';
import { Transaction } from '../types';
import AddTransactionModal from '../components/AddTransactionModal';

type FilterType = 'all' | 'income' | 'expense';

function TransactionItem({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (id: string) => void;
}) {
  const cat = getCategoryById(tx.category);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      tx.description,
      `${formatCurrency(tx.amount)} · ${tx.date}`,
      [
        { text: 'Edit',   onPress: () => onEdit(tx) },
        { text: 'Delete', style: 'destructive', onPress: () => {
          Alert.alert('Delete Transaction', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => onDelete(tx.id) },
          ]);
        }},
        { text: 'Cancel', style: 'cancel' },
      ],
    );
  }, [tx, onEdit, onDelete]);

  return (
    <TouchableOpacity style={S.txRow} onLongPress={handleLongPress} activeOpacity={0.7}>
      <View style={[S.txIconWrap, { backgroundColor: (cat?.color ?? COLORS.primary) + '22' }]}>
        <Text style={S.txIcon}>{cat?.icon ?? '📦'}</Text>
      </View>
      <View style={S.txInfo}>
        <Text style={S.txDesc} numberOfLines={1}>{tx.description}</Text>
        <Text style={S.txMeta}>{cat?.name ?? tx.category} · {tx.date}</Text>
        {tx.notes ? <Text style={S.txNotes} numberOfLines={1}>{tx.notes}</Text> : null}
      </View>
      <Text style={[S.txAmount, { color: tx.type === 'income' ? COLORS.income : COLORS.expense }]}>
        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
      </Text>
    </TouchableOpacity>
  );
}

function DateGroup({ date, children }: { date: string; children: React.ReactNode }) {
  const label = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');
    if (date === today) return 'Today';
    if (date === yesterday) return 'Yesterday';
    return format(new Date(date), 'EEE, MMM d');
  }, [date]);
  return (
    <View>
      <Text style={S.dateHeader}>{label}</Text>
      {children}
    </View>
  );
}

export default function TransactionsScreen() {
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useFinance();

  const [search,        setSearch]        = useState('');
  const [filterType,    setFilterType]    = useState<FilterType>('all');
  const [filterCat,     setFilterCat]     = useState('');
  const [showModal,     setShowModal]     = useState(false);
  const [editingTx,     setEditingTx]     = useState<Transaction | undefined>();
  const [selectedDate,  setSelectedDate]  = useState(new Date());

  const month = format(selectedDate, 'yyyy-MM');

  const filtered = useMemo(() => {
    let list = transactions.filter(t => t.date.startsWith(month));
    if (filterType !== 'all') list = list.filter(t => t.type === filterType);
    if (filterCat)            list = list.filter(t => t.category === filterCat);
    if (search.trim())        list = list.filter(t =>
      t.description.toLowerCase().includes(search.toLowerCase()) ||
      (getCategoryById(t.category)?.name ?? '').toLowerCase().includes(search.toLowerCase()),
    );
    return list;
  }, [transactions, month, filterType, filterCat, search]);

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, Transaction[]> = {};
    filtered.forEach(t => {
      (map[t.date] = map[t.date] || []).push(t);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  const total = useMemo(() => ({
    income:   filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    expenses: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
  }), [filtered]);

  const handleEdit = useCallback((tx: Transaction) => {
    setEditingTx(tx);
    setShowModal(true);
  }, []);

  const handleSave = useCallback(async (data: Omit<Transaction, 'id'>) => {
    if (editingTx) {
      updateTransaction({ ...editingTx, ...data });
    } else {
      await addTransaction(data);
    }
    setEditingTx(undefined);
  }, [editingTx, addTransaction, updateTransaction]);

  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setEditingTx(undefined);
  }, []);

  const allCats = filterType === 'income' ? INCOME_CATEGORIES : filterType === 'expense' ? EXPENSE_CATEGORIES : [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES];

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* Header */}
      <View style={S.header}>
        <View style={S.headerTop}>
          <View>
            <Text style={S.title}>Transactions</Text>
            <Text style={S.subtitle}>{filtered.length} entries · {format(selectedDate, 'MMM yyyy')}</Text>
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

        {/* Summary pills */}
        <View style={S.summaryRow}>
          <View style={[S.summaryPill, { backgroundColor: COLORS.successDim }]}>
            <Text style={S.summaryLabel}>Income</Text>
            <Text style={[S.summaryValue, { color: COLORS.income }]}>{formatCurrency(total.income, true)}</Text>
          </View>
          <View style={[S.summaryPill, { backgroundColor: COLORS.dangerDim }]}>
            <Text style={S.summaryLabel}>Expenses</Text>
            <Text style={[S.summaryValue, { color: COLORS.expense }]}>{formatCurrency(total.expenses, true)}</Text>
          </View>
        </View>

        {/* Search */}
        <View style={S.searchWrap}>
          <Text style={S.searchIcon}>🔍</Text>
          <TextInput
            style={S.searchInput}
            placeholder="Search transactions…"
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Text style={S.clearTxt}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Type filter */}
        <View style={S.filterRow}>
          {(['all', 'expense', 'income'] as FilterType[]).map(f => (
            <TouchableOpacity
              key={f}
              style={[S.filterChip, filterType === f && S.filterChipActive]}
              onPress={() => { setFilterType(f); setFilterCat(''); }}
            >
              <Text style={[S.filterChipTxt, filterType === f && S.filterChipTxtActive]}>
                {f === 'all' ? 'All' : f === 'income' ? '↓ Income' : '↑ Expenses'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* List */}
      <FlatList
        data={grouped}
        keyExtractor={([date]) => date}
        renderItem={({ item: [date, txs] }) => (
          <DateGroup date={date}>
            <View style={S.txGroup}>
              {txs.map((tx, i) => (
                <View key={tx.id} style={[i < txs.length - 1 && S.txDivider]}>
                  <TransactionItem tx={tx} onEdit={handleEdit} onDelete={deleteTransaction} />
                </View>
              ))}
            </View>
          </DateGroup>
        )}
        ListEmptyComponent={
          <View style={S.empty}>
            <Text style={S.emptyIcon}>📭</Text>
            <Text style={S.emptyTxt}>No transactions found</Text>
            <Text style={S.emptySub}>{search ? 'Try different search terms' : 'Tap + to add your first transaction'}</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />

      <AddTransactionModal
        visible={showModal}
        onClose={handleCloseModal}
        onSave={handleSave}
        initial={editingTx}
      />
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },

  header: { backgroundColor: COLORS.background, paddingHorizontal: SPACING.md, paddingTop: SPACING.sm },
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: SPACING.sm },
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

  summaryRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  summaryPill: { flex: 1, borderRadius: RADIUS.md, padding: SPACING.sm },
  summaryLabel: { color: COLORS.textSecondary, fontSize: FONT.xs, marginBottom: 2 },
  summaryValue: { fontSize: FONT.md, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm, marginBottom: SPACING.sm,
  },
  searchIcon:  { fontSize: 14 },
  searchInput: { flex: 1, color: COLORS.text, fontSize: FONT.md, paddingVertical: 10 },
  clearTxt:    { color: COLORS.textSecondary, padding: 4 },

  filterRow: { flexDirection: 'row', gap: 8, paddingBottom: SPACING.sm },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive:    { backgroundColor: COLORS.primaryDim, borderColor: COLORS.primary },
  filterChipTxt:       { color: COLORS.textSecondary, fontSize: FONT.sm },
  filterChipTxtActive: { color: COLORS.primary, fontWeight: '600' },

  dateHeader: {
    color: COLORS.textMuted, fontSize: FONT.xs,
    fontWeight: '700', letterSpacing: 0.5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
  },
  txGroup: {
    marginHorizontal: SPACING.md,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 8,
    overflow: 'hidden',
  },
  txDivider: { borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.md },
  txIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txIcon:     { fontSize: 20 },
  txInfo:     { flex: 1 },
  txDesc:     { color: COLORS.text, fontSize: FONT.md, fontWeight: '600' },
  txMeta:     { color: COLORS.textSecondary, fontSize: FONT.xs, marginTop: 2 },
  txNotes:    { color: COLORS.textMuted, fontSize: FONT.xs, marginTop: 1, fontStyle: 'italic' },
  txAmount:   { fontSize: FONT.md, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: SPACING.xxl },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.md },
  emptyTxt:  { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  emptySub:  { color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 8, textAlign: 'center' },
});
