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
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { GOAL_ICONS, GOAL_COLORS } from '../constants/categories';
import { Goal } from '../types';
import { parseCurrencyInput } from '../utils/currency';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSave: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
}

const DEFAULT_ICON  = GOAL_ICONS[0];
const DEFAULT_COLOR = GOAL_COLORS[0];

export default function AddGoalModal({ visible, onClose, onSave }: Props) {
  const [name,       setName]       = useState('');
  const [targetStr,  setTargetStr]  = useState('');
  const [deadline,   setDeadline]   = useState('');
  const [icon,       setIcon]       = useState(DEFAULT_ICON);
  const [color,      setColor]      = useState(DEFAULT_COLOR);

  const reset = () => { setName(''); setTargetStr(''); setDeadline(''); setIcon(DEFAULT_ICON); setColor(DEFAULT_COLOR); };

  const handleSave = useCallback(() => {
    const target = parseCurrencyInput(targetStr);
    if (!name.trim())   { Alert.alert('Missing name', 'Please enter a goal name.'); return; }
    if (target <= 0)    { Alert.alert('Invalid target', 'Enter a target amount greater than 0.'); return; }
    if (!deadline)      { Alert.alert('No deadline', 'Please set a target date (YYYY-MM-DD).'); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) { Alert.alert('Invalid date', 'Use YYYY-MM-DD format.'); return; }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSave({ name: name.trim(), targetAmount: target, currentAmount: 0, deadline, icon, color });
    reset();
    onClose();
  }, [name, targetStr, deadline, icon, color, onSave, onClose]);

  const handleClose = () => { reset(); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />
          <View style={S.header}>
            <Text style={S.title}>New Goal</Text>
            <TouchableOpacity onPress={handleClose} style={S.closeBtn}>
              <Text style={S.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Icon & Color Preview */}
            <View style={[S.preview, { backgroundColor: color + '22', borderColor: color }]}>
              <Text style={S.previewIcon}>{icon}</Text>
              <Text style={[S.previewName, { color }]}>{name || 'My Goal'}</Text>
            </View>

            {/* Icon picker */}
            <Text style={S.label}>Icon</Text>
            <View style={S.iconRow}>
              {GOAL_ICONS.map(ic => (
                <TouchableOpacity
                  key={ic}
                  style={[S.iconBtn, icon === ic && S.iconBtnActive]}
                  onPress={() => setIcon(ic)}
                >
                  <Text style={S.iconTxt}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color picker */}
            <Text style={S.label}>Color</Text>
            <View style={S.colorRow}>
              {GOAL_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  style={[S.colorDot, { backgroundColor: c }, color === c && S.colorDotActive]}
                  onPress={() => setColor(c)}
                />
              ))}
            </View>

            {/* Name */}
            <Text style={S.label}>Goal Name</Text>
            <TextInput
              style={S.input}
              placeholder="e.g. Emergency Fund, New Car…"
              placeholderTextColor={COLORS.textMuted}
              value={name}
              onChangeText={setName}
            />

            {/* Target */}
            <Text style={S.label}>Target Amount</Text>
            <TextInput
              style={S.amountInput}
              placeholder="0.00"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
              value={targetStr}
              onChangeText={setTargetStr}
            />

            {/* Deadline */}
            <Text style={S.label}>Target Date</Text>
            <TextInput
              style={S.input}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
              value={deadline}
              onChangeText={setDeadline}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />

            <TouchableOpacity style={S.saveBtn} onPress={handleSave}>
              <Text style={S.saveTxt}>Create Goal</Text>
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
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: RADIUS.full, alignSelf: 'center',
    marginTop: 12, marginBottom: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  title:    { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  closeBtn: { padding: SPACING.sm },
  closeTxt: { color: COLORS.textSecondary, fontSize: FONT.lg },

  preview: {
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  previewIcon: { fontSize: 48, marginBottom: 8 },
  previewName: { fontSize: FONT.lg, fontWeight: '700' },

  label: { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600', marginBottom: 6, marginTop: 4 },

  iconRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: SPACING.sm },
  iconBtn: {
    width: 44, height: 44, borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  iconBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryDim },
  iconTxt: { fontSize: 22 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.sm },
  colorDot: { width: 28, height: 28, borderRadius: 14 },
  colorDotActive: { borderWidth: 3, borderColor: COLORS.text },

  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 12,
    color: COLORS.text, fontSize: FONT.md,
    marginBottom: SPACING.sm,
  },
  amountInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    color: COLORS.text, fontSize: FONT.xxl, fontWeight: '700',
    textAlign: 'center', marginBottom: SPACING.sm,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg, paddingVertical: 16,
    alignItems: 'center', marginTop: SPACING.md,
  },
  saveTxt: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
});
