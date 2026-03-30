import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../constants/categories';
import { Transaction } from '../types';
import { parseCurrencyInput } from '../utils/currency';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (tx: Omit<Transaction, 'id'>) => void;
  initial?: Transaction;
}

const TODAY = format(new Date(), 'yyyy-MM-dd');
const YESTERDAY = format(new Date(Date.now() - 86400000), 'yyyy-MM-dd');

export default function AddTransactionModal({ visible, onClose, onSave, initial }: Props) {
  const [type,        setType]        = useState<'income' | 'expense'>(initial?.type ?? 'expense');
  const [amount,      setAmount]      = useState(initial ? String(initial.amount) : '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category,    setCategory]    = useState(initial?.category ?? '');
  const [date,        setDate]        = useState(initial?.date ?? TODAY);
  const [notes,       setNotes]       = useState(initial?.notes ?? '');

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const reset = useCallback(() => {
    setType('expense');
    setAmount('');
    setDescription('');
    setCategory('');
    setDate(TODAY);
    setNotes('');
  }, []);

  const handleSave = useCallback(() => {
    const num = parseCurrencyInput(amount);
    if (num <= 0)       { Alert.alert('Invalid amount', 'Please enter an amount greater than 0.'); return; }
    if (!description.trim()) { Alert.alert('Missing description', 'Please enter a description.'); return; }
    if (!category)       { Alert.alert('No category', 'Please select a category.'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { Alert.alert('Invalid date', 'Use format YYYY-MM-DD.'); return; }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ type, amount: num, description: description.trim(), category, date, notes: notes.trim() || undefined });
    reset();
    onClose();
  }, [type, amount, description, category, date, notes, onSave, reset, onClose]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={S.overlay}>
        <View style={S.sheet}>
          {/* Handle */}
          <View style={S.handle} />

          {/* Header */}
          <View style={S.header}>
            <Text style={S.title}>{initial ? 'Edit Transaction' : 'New Transaction'}</Text>
            <TouchableOpacity onPress={handleClose} style={S.closeBtn}>
              <Text style={S.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Type toggle */}
            <View style={S.typeRow}>
              {(['expense', 'income'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[S.typeBtn, type === t && (t === 'expense' ? S.typeBtnExpense : S.typeBtnIncome)]}
                  onPress={() => { setType(t); setCategory(''); }}
                >
                  <Text style={[S.typeBtnTxt, type === t && S.typeBtnTxtActive]}>
                    {t === 'expense' ? '↑ Expense' : '↓ Income'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Amount */}
            <Text style={S.label}>Amount</Text>
            <TextInput
              style={S.amountInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
            />

            {/* Description */}
            <Text style={S.label}>Description</Text>
            <TextInput
              style={S.input}
              placeholder="What was this for?"
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
            />

            {/* Category */}
            <Text style={S.label}>Category</Text>
            <View style={S.categoryGrid}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[S.catChip, category === cat.id && { backgroundColor: cat.color + '33', borderColor: cat.color }]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={S.catIcon}>{cat.icon}</Text>
                  <Text style={[S.catName, category === cat.id && { color: cat.color }]}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date */}
            <Text style={S.label}>Date</Text>
            <View style={S.dateRow}>
              {[{ label: 'Today', value: TODAY }, { label: 'Yesterday', value: YESTERDAY }].map(d => (
                <TouchableOpacity
                  key={d.value}
                  style={[S.dateShortcut, date === d.value && S.dateShortcutActive]}
                  onPress={() => setDate(d.value)}
                >
                  <Text style={[S.dateShortcutTxt, date === d.value && S.dateShortcutTxtActive]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={S.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={date}
              onChangeText={setDate}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            {/* Notes */}
            <Text style={S.label}>Notes (optional)</Text>
            <TextInput
              style={[S.input, S.notesInput]}
              placeholder="Any extra details..."
              placeholderTextColor={COLORS.textMuted}
              value={notes}
              onChangeText={setNotes}
              multiline
            />

            <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
              <Text style={S.saveTxt}>{initial ? 'Save Changes' : 'Add Transaction'}</Text>
            </TouchableOpacity>

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingHorizontal: SPACING.md,
    paddingBottom: 0,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  title:    { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  closeBtn: { padding: SPACING.sm },
  closeTxt: { color: COLORS.textSecondary, fontSize: FONT.lg },

  typeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeBtnExpense: { backgroundColor: COLORS.dangerDim,  borderColor: COLORS.danger  },
  typeBtnIncome:  { backgroundColor: COLORS.successDim, borderColor: COLORS.success },
  typeBtnTxt:     { color: COLORS.textSecondary, fontSize: FONT.md, fontWeight: '600' },
  typeBtnTxtActive: { color: COLORS.text },

  label: { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600', marginBottom: 6, marginTop: 4 },

  amountInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: FONT.xxl,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontSize: FONT.md,
    marginBottom: SPACING.sm,
  },
  notesInput: { height: 80, textAlignVertical: 'top' },

  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.sm },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  catIcon: { fontSize: 14 },
  catName: { color: COLORS.textSecondary, fontSize: FONT.xs, fontWeight: '500' },

  dateRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: 8 },
  dateShortcut: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateShortcutActive:    { backgroundColor: COLORS.primaryDim, borderColor: COLORS.primary },
  dateShortcutTxt:       { color: COLORS.textSecondary, fontSize: FONT.sm },
  dateShortcutTxtActive: { color: COLORS.primary, fontWeight: '600' },

  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveTxt: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
});
