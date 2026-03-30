import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { EXPENSE_CATEGORIES, getCategoryById, GROUP_LABELS } from '../constants/categories';
import { Budget } from '../types';
import { parseCurrencyInput, formatCurrency } from '../utils/currency';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (budget: Budget) => void;
  month: string; // YYYY-MM
  existingBudgets: Budget[];
}

const GROUPS = ['essentials', 'lifestyle', 'financial', 'personal'] as const;

export default function SetBudgetModal({ visible, onClose, onSave, month, existingBudgets }: Props) {
  const [selectedCat, setSelectedCat] = useState('');
  const [limitStr,    setLimitStr]    = useState('');

  const existing = existingBudgets.find(
    b => b.categoryId === selectedCat && b.month === month,
  );

  const handleSelectCat = useCallback((id: string) => {
    setSelectedCat(id);
    const ex = existingBudgets.find(b => b.categoryId === id && b.month === month);
    setLimitStr(ex ? String(ex.limit) : '');
  }, [existingBudgets, month]);

  const handleSave = useCallback(() => {
    if (!selectedCat) { Alert.alert('No category', 'Please select a category.'); return; }
    const limit = parseCurrencyInput(limitStr);
    if (limit <= 0)   { Alert.alert('Invalid limit', 'Enter an amount greater than 0.'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ categoryId: selectedCat, limit, month });
    setSelectedCat('');
    setLimitStr('');
    onClose();
  }, [selectedCat, limitStr, month, onSave, onClose]);

  const handleClose = useCallback(() => {
    setSelectedCat('');
    setLimitStr('');
    onClose();
  }, [onClose]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />
          <View style={S.header}>
            <View>
              <Text style={S.title}>Set Budget</Text>
              <Text style={S.subtitle}>{format(new Date(month + '-01'), 'MMMM yyyy')}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={S.closeBtn}>
              <Text style={S.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {GROUPS.map(group => (
              <View key={group}>
                <Text style={S.groupLabel}>{GROUP_LABELS[group]}</Text>
                <View style={S.catGrid}>
                  {EXPENSE_CATEGORIES.filter(c => c.group === group).map(cat => {
                    const hasLimit = existingBudgets.some(b => b.categoryId === cat.id && b.month === month);
                    const isSelected = selectedCat === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          S.catChip,
                          isSelected && { backgroundColor: cat.color + '33', borderColor: cat.color },
                          hasLimit && !isSelected && S.catChipHasLimit,
                        ]}
                        onPress={() => handleSelectCat(cat.id)}
                      >
                        <Text style={S.catIcon}>{cat.icon}</Text>
                        <Text style={[S.catName, isSelected && { color: cat.color }]}>{cat.name}</Text>
                        {hasLimit && (
                          <Text style={S.catLimit}>
                            {formatCurrency(
                              existingBudgets.find(b => b.categoryId === cat.id && b.month === month)!.limit,
                              true,
                            )}
                          </Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}

            {selectedCat ? (
              <View style={S.limitSection}>
                <Text style={S.label}>
                  Monthly limit for {getCategoryById(selectedCat)?.icon} {getCategoryById(selectedCat)?.name}
                </Text>
                <TextInput
                  style={S.amountInput}
                  placeholder="0.00"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  value={limitStr}
                  onChangeText={setLimitStr}
                  autoFocus
                />
              </View>
            ) : (
              <View style={S.hintBox}>
                <Text style={S.hintTxt}>Select a category above to set its monthly budget limit.</Text>
              </View>
            )}

            <TouchableOpacity style={[S.saveBtn, !selectedCat && S.saveBtnDisabled]} onPress={handleSave}>
              <Text style={S.saveTxt}>Save Budget</Text>
            </TouchableOpacity>
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingHorizontal: SPACING.md,
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.full,
    alignSelf: 'center',
    marginTop: 12, marginBottom: 8,
  },
  header: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
  },
  title:    { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 2 },
  closeBtn: { padding: SPACING.sm },
  closeTxt: { color: COLORS.textSecondary, fontSize: FONT.lg },

  groupLabel: {
    color: COLORS.textMuted,
    fontSize: FONT.xs,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: SPACING.md,
    marginBottom: 8,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catChipHasLimit: { borderColor: COLORS.primaryDim },
  catIcon: { fontSize: 14 },
  catName: { color: COLORS.textSecondary, fontSize: FONT.xs, fontWeight: '500' },
  catLimit: { color: COLORS.primary, fontSize: FONT.xs, marginLeft: 2 },

  limitSection: { marginTop: SPACING.lg },
  label: { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600', marginBottom: 8 },
  amountInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    color: COLORS.text, fontSize: FONT.xxl, fontWeight: '700',
    textAlign: 'center',
  },

  hintBox: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  hintTxt: { color: COLORS.textSecondary, fontSize: FONT.sm, textAlign: 'center' },

  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveTxt: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
});
