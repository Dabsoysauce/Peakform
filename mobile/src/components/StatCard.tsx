import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../theme';

interface Props {
  label: string;
  value: string | number;
  sub?: string;
}

export default function StatCard({ label, value, sub }: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  value: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryLight,
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
  },
  sub: {
    fontSize: 11,
    color: colors.success,
    marginTop: 2,
  },
});
