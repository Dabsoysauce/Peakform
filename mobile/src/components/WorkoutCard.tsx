import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface Props {
  workout: any;
}

export default function WorkoutCard({ workout }: Props) {
  const exerciseCount = workout.exercises?.length ?? 0;
  const date = workout.created_at ? new Date(workout.created_at).toLocaleDateString() : '';

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{workout.name || workout.title || 'Workout'}</Text>
        {date ? <Text style={styles.date}>{date}</Text> : null}
      </View>
      {workout.description ? (
        <Text style={styles.desc} numberOfLines={2}>{workout.description}</Text>
      ) : null}
      {exerciseCount > 0 && (
        <Text style={styles.tag}>{exerciseCount} exercise{exerciseCount !== 1 ? 's' : ''}</Text>
      )}
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
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: colors.textMuted,
  },
  desc: {
    fontSize: 13,
    color: colors.textSub,
    marginBottom: 6,
  },
  tag: {
    fontSize: 12,
    color: colors.primaryLight,
    backgroundColor: 'rgba(37,99,235,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
});
