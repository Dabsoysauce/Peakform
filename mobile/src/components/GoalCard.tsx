import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface Props {
  goal: any;
  onToggle: (id: number, completed: boolean) => void;
}

export default function GoalCard({ goal, onToggle }: Props) {
  const done = goal.completed || goal.status === 'completed';
  return (
    <View style={[styles.card, done && styles.done]}>
      <TouchableOpacity style={styles.check} onPress={() => onToggle(goal.id, !done)}>
        <View style={[styles.checkbox, done && styles.checked]}>
          {done && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <View style={styles.body}>
        <Text style={[styles.title, done && styles.strikethrough]}>{goal.title}</Text>
        {goal.description ? (
          <Text style={styles.desc} numberOfLines={2}>{goal.description}</Text>
        ) : null}
        {goal.target_date ? (
          <Text style={styles.date}>Due {new Date(goal.target_date).toLocaleDateString()}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  done: { opacity: 0.6 },
  check: { paddingTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  body: { flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 2 },
  strikethrough: { textDecorationLine: 'line-through', color: colors.textMuted },
  desc: { fontSize: 13, color: colors.textSub, marginBottom: 4 },
  date: { fontSize: 12, color: colors.warning },
});
