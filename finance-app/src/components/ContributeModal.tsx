import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS, FONT } from '../constants/theme';
import { Goal } from '../types';
import { parseCurrencyInput, formatCurrency } from '../utils/currency';

interface Props {
  visible: boolean;
  goal: Goal | null;
  onClose: () => void;
  onContribute: (amount: number) => void;
}

export default function ContributeModal({ visible, goal, onClose, onContribute }: Props) {
  const [amountStr, setAmountStr] = useState('');

  const remaining = goal ? goal.targetAmount - goal.currentAmount : 0;

  const handleSave = () => {
    const amount = parseCurrencyInput(amountStr);
    if (amount <= 0) { Alert.alert('Invalid amount', 'Enter an amount greater than 0.'); return; }
    if (amount > remaining) {
      Alert.alert('Too much', `Only ${formatCurrency(remaining)} remaining to reach the goal.`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onContribute(amount);
    setAmountStr('');
    onClose();
  };

  const handleClose = () => { setAmountStr(''); onClose(); };

  if (!goal) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={S.overlay}>
        <View style={S.sheet}>
          <View style={S.handle} />

          <View style={S.preview}>
            <Text style={S.icon}>{goal.icon}</Text>
            <Text style={S.name}>{goal.name}</Text>
            <Text style={S.sub}>{formatCurrency(remaining)} remaining</Text>
          </View>

          <Text style={S.label}>Add Contribution</Text>
          <TextInput
            style={S.amountInput}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            value={amountStr}
            onChangeText={setAmountStr}
            autoFocus
          />

          {/* Quick amounts */}
          <View style={S.quickRow}>
            {[10, 25, 50, 100].map(v => (
              <TouchableOpacity
                key={v}
                style={S.quickBtn}
                onPress={() => setAmountStr(String(Math.min(v, remaining)))}
              >
                <Text style={S.quickTxt}>${v}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={S.quickBtn}
              onPress={() => setAmountStr(remaining.toFixed(2))}
            >
              <Text style={S.quickTxt}>Full</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={[S.saveBtn, { backgroundColor: goal.color }]} onPress={handleSave}>
            <Text style={S.saveTxt}>Add to Goal</Text>
          </TouchableOpacity>
          <TouchableOpacity style={S.cancelBtn} onPress={handleClose}>
            <Text style={S.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <View style={{ height: 24 }} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: SPACING.md, paddingBottom: 0,
  },
  handle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: RADIUS.full, alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  preview: { alignItems: 'center', marginBottom: SPACING.lg },
  icon: { fontSize: 48, marginBottom: 8 },
  name: { color: COLORS.text, fontSize: FONT.lg, fontWeight: '700' },
  sub:  { color: COLORS.textSecondary, fontSize: FONT.sm, marginTop: 4 },

  label: { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600', marginBottom: 8 },
  amountInput: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: SPACING.md, paddingVertical: 14,
    color: COLORS.text, fontSize: FONT.xxl, fontWeight: '700',
    textAlign: 'center', marginBottom: SPACING.md,
  },
  quickRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  quickBtn: {
    flex: 1, paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  quickTxt: { color: COLORS.textSecondary, fontSize: FONT.sm, fontWeight: '600' },

  saveBtn: { borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: 'center', marginBottom: SPACING.sm },
  saveTxt: { color: COLORS.text, fontSize: FONT.md, fontWeight: '700' },
  cancelBtn: { paddingVertical: 12, alignItems: 'center' },
  cancelTxt: { color: COLORS.textSecondary, fontSize: FONT.md },
});
